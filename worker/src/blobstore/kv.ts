/**
 * EdgeOne Pages Blob 的最小访问抽象。
 * 只封装本仓库用到的能力；onlyIfNew 是平台唯一的条件写原语（创建时 CAS），
 * 约定 set 在 onlyIfNew 命中已存在键时返回 false，其余情况返回 true。
 */
export interface BlobKv {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { onlyIfNew?: boolean }): Promise<boolean>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

/**
 * 测试与本地调试用的内存实现，语义与 EdgeOne Blob SDK 对齐：
 * 键值均为字符串，onlyIfNew 命中已有键时不写入并返回 false。
 */
export class MemoryBlobKv implements BlobKv {
  private readonly data = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async set(key: string, value: string, options?: { onlyIfNew?: boolean }): Promise<boolean> {
    if (options?.onlyIfNew && this.data.has(key)) {
      return false;
    }
    this.data.set(key, value);
    return true;
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async list(prefix: string): Promise<string[]> {
    return Array.from(this.data.keys())
      .filter((key) => key.startsWith(prefix))
      .sort();
  }

  /** 测试辅助：直接探查原始数据 */
  snapshot(): Map<string, string> {
    return this.data;
  }
}
