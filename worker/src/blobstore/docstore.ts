import type { BlobKv } from "./kv";

/**
 * Blob 上没有 SQL，也没有更新级 CAS；唯一条件写是创建时 onlyIfNew。
 * 本模块用它构造两个核心原语：
 *  1. 版本化文档：键为 `${base}/v{n}`，写入固定创建 v+1（onlyIfNew），
 *     并发冲突由调用方重读重试 —— 等价于乐观并发控制；
 *  2. 唯一指针：create 只允许 v1 成功一次，等价于 UNIQUE 约束。
 */

export type Versioned<T> = { v: number; data: T };

/** 业务前置条件不满足（对应 SQL preconditioned UPDATE 的 changes !== 1） */
export class PreconditionFailedError extends Error {
  constructor(reason = "precondition failed") {
    super(reason);
    this.name = "PreconditionFailedError";
  }
}

/** 并发写冲突，可安全重试（重读后重放变更） */
export class CasConflictError extends Error {
  constructor(public readonly base: string) {
    super(`concurrent write conflict on ${base}`);
    this.name = "CasConflictError";
  }
}

/** 唯一键冲突；消息含 “UNIQUE” 以兼容 service 层按错误串识别冲突的约定 */
export class UniqueViolationError extends Error {
  constructor(public readonly base: string) {
    super(`UNIQUE constraint failed: ${base}`);
    this.name = "UniqueViolationError";
  }
}

const DEFAULT_MAX_ATTEMPTS = 8;

export class DocStore {
  constructor(public readonly kv: BlobKv) {}

  async read<T>(base: string): Promise<Versioned<T> | null> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const version = await this.latestVersion(base);
      if (version === null) {
        return null;
      }
      const raw = await this.kv.get(`${base}/v${version}`);
      if (raw === null) {
        // 读取瞬间该版本恰被清理：重试一次列表解析
        continue;
      }
      try {
        return JSON.parse(raw) as Versioned<T>;
      } catch {
        return null;
      }
    }
    return null;
  }

  async readData<T>(base: string): Promise<T | null> {
    return (await this.read<T>(base))?.data ?? null;
  }

  private async latestVersion(base: string): Promise<number | null> {
    const keys = await this.kv.list(`${base}/v`);
    let latest: number | null = null;
    for (const key of keys) {
      const match = /\/v(\d+)$/.exec(key);
      if (!match) {
        continue;
      }
      const version = Number(match[1]);
      if (latest === null || version > latest) {
        latest = version;
      }
    }
    return latest;
  }

  /** 创建 v1；已存在时抛 UniqueViolationError（等价 UNIQUE 约束） */
  async create<T>(base: string, data: T): Promise<Versioned<T>> {
    const created = await this.kv.set(`${base}/v1`, JSON.stringify({ v: 1, data }), { onlyIfNew: true });
    if (!created) {
      throw new UniqueViolationError(base);
    }
    return { v: 1, data };
  }

  /** 创建 v1；已存在时返回 false，不抛错 */
  async createIfAbsent<T>(base: string, data: T): Promise<boolean> {
    return await this.kv.set(`${base}/v1`, JSON.stringify({ v: 1, data }), { onlyIfNew: true });
  }

  /** 以 CAS 写入 v+1；并发冲突抛 CasConflictError，由调用方重读重试 */
  async write<T>(base: string, data: T, expectedV: number): Promise<Versioned<T>> {
    const nextV = expectedV + 1;
    const created = await this.kv.set(`${base}/v${nextV}`, JSON.stringify({ v: nextV, data }), { onlyIfNew: true });
    if (!created) {
      throw new CasConflictError(base);
    }
    // 只保留上一代版本，兼顾并发读窗口与存储回收
    const staleVersion = expectedV - 1;
    if (staleVersion >= 1) {
      try {
        await this.kv.delete(`${base}/v${staleVersion}`);
      } catch {
        // 清理失败不影响正确性，下次写入再回收
      }
    }
    return { v: nextV, data };
  }

  /**
   * 乐观变更：读最新 → fn 生成新值（业务拒绝抛 PreconditionFailedError）→ CAS 写入；
   * 冲突自动重读重试，重试次数用尽抛 CasConflictError。
   */
  async mutate<T>(
    base: string,
    fn: (current: T | null) => Promise<T> | T,
    maxAttempts = DEFAULT_MAX_ATTEMPTS
  ): Promise<Versioned<T>> {
    let lastConflict: CasConflictError | null = null;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const current = await this.read<T>(base);
      const next = await fn(current?.data ?? null);
      try {
        return await this.write(base, next, current?.v ?? 0);
      } catch (error) {
        if (error instanceof CasConflictError) {
          lastConflict = error;
          continue;
        }
        throw error;
      }
    }
    throw lastConflict ?? new CasConflictError(base);
  }

  async deleteAll(base: string): Promise<void> {
    const keys = await this.kv.list(`${base}/v`);
    await Promise.all(keys.map((key) => this.kv.delete(key)));
  }

  /** 列出某个目录前缀下的所有「基础键」（去掉 /v{n} 后缀） */
  async listBases(prefix: string): Promise<string[]> {
    const dir = prefix.endsWith("/") ? prefix : `${prefix}/`;
    const keys = await this.kv.list(dir);
    const bases = new Set<string>();
    for (const key of keys) {
      const match = /^(.*)\/v\d+$/.exec(key);
      if (match && match[1].startsWith(dir)) {
        bases.add(match[1]);
      }
    }
    return Array.from(bases).sort();
  }
}

/**
 * 数字 ID 分配器。Blob 没有自增列：以 seq/{entity} 文档做 CAS 发号，
 * 每次批发一块减小写竞争；同 isolate 内用缓冲复用，跨 isolate 靠 CAS 保证不重叠。
 * 分配只保证唯一，不保证严格递增与写入顺序一致（与业务语义兼容）。
 */
export class IdAllocator {
  private buffer: number[] = [];

  constructor(
    private readonly store: DocStore,
    private readonly entity: string,
    private readonly blockSize = 32
  ) {}

  async allocate(count: number): Promise<number[]> {
    const ids: number[] = [];
    while (ids.length < count) {
      if (this.buffer.length === 0) {
        await this.refill(Math.max(count, this.blockSize));
      }
      const take = Math.min(this.buffer.length, count - ids.length);
      ids.push(...this.buffer.splice(0, take));
    }
    return ids;
  }

  async allocateOne(): Promise<number> {
    return (await this.allocate(1))[0];
  }

  private async refill(blockSize: number): Promise<void> {
    let start = 0;
    await this.store.mutate<{ next: number }>(
      `seq/${this.entity}`,
      (current) => {
        start = current?.next ?? 1;
        return { next: start + blockSize };
      }
    );
    for (let offset = 0; offset < blockSize; offset += 1) {
      this.buffer.push(start + offset);
    }
  }
}
