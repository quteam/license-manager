import { describe, expect, it } from "vitest";
import { CasConflictError, DocStore, IdAllocator, PreconditionFailedError, UniqueViolationError } from "../src/blobstore/docstore";
import { MemoryBlobKv, type BlobKv } from "../src/blobstore/kv";

/** 在第一次 get（即 mutate 的读取步骤）之后注入一次写入，用于确定性模拟并发竞争 */
class InjectingKv implements BlobKv {
  private fired = false;

  constructor(
    private readonly inner: MemoryBlobKv,
    private readonly inject: (inner: MemoryBlobKv) => Promise<void>,
    private readonly once = true
  ) {}

  async get(key: string): Promise<string | null> {
    const value = await this.inner.get(key);
    if (!this.fired || !this.once) {
      this.fired = true;
      await this.inject(this.inner);
    }
    return value;
  }

  async set(key: string, value: string, options?: { onlyIfNew?: boolean }): Promise<boolean> {
    return await this.inner.set(key, value, options);
  }

  async delete(key: string): Promise<void> {
    await this.inner.delete(key);
  }

  async list(prefix: string): Promise<string[]> {
    return await this.inner.list(prefix);
  }
}

describe("DocStore", () => {
  it("creates v1 and rejects duplicate creation with a UNIQUE message", async () => {
    const store = new DocStore(new MemoryBlobKv());
    await store.create("entity/a", { x: 1 });
    await expect(store.create("entity/a", { x: 2 })).rejects.toThrowError(UniqueViolationError);
    await expect(store.create("entity/a", { x: 2 })).rejects.toThrowError(/UNIQUE constraint failed: entity\/a/);
  });

  it("createIfAbsent returns false instead of throwing on conflict", async () => {
    const store = new DocStore(new MemoryBlobKv());
    expect(await store.createIfAbsent("entity/a", 1)).toBe(true);
    expect(await store.createIfAbsent("entity/a", 2)).toBe(false);
    expect(await store.readData<number>("entity/a")).toBe(1);
  });

  it("mutates with version CAS and keeps only the previous version", async () => {
    const kv = new MemoryBlobKv();
    const store = new DocStore(kv);
    await store.create("entity/a", { count: 0 });
    const first = await store.mutate<{ count: number }>("entity/a", (current) => ({ count: (current?.count ?? 0) + 1 }));
    const second = await store.mutate<{ count: number }>("entity/a", (current) => ({ count: (current?.count ?? 0) + 1 }));
    expect(first).toMatchObject({ v: 2, data: { count: 1 } });
    expect(second).toMatchObject({ v: 3, data: { count: 2 } });
    const keys = await kv.list("entity/a/v");
    expect(keys).toEqual(["entity/a/v2", "entity/a/v3"]);
  });

  it("re-reads and re-applies the mutation after a concurrent conflict", async () => {
    const kv = new MemoryBlobKv();
    const store = new DocStore(kv);
    await store.create("entity/a", { count: 0 });
    const injecting = new InjectingKv(kv, async (inner) => {
      // 模拟竞争者抢先写入 v2
      await inner.set("entity/a/v2", JSON.stringify({ v: 2, data: { count: 100 } }));
    });
    const racing = new DocStore(injecting);
    const result = await racing.mutate<{ count: number }>("entity/a", (current) => ({ count: (current?.count ?? 0) + 1 }));
    expect(result.v).toBe(3);
    expect(result.data.count).toBe(101);
    expect(await new DocStore(kv).readData<{ count: number }>("entity/a")).toEqual({ count: 101 });
  });

  it("propagates precondition failures without retrying", async () => {
    const store = new DocStore(new MemoryBlobKv());
    let calls = 0;
    await expect(
      store.mutate("missing/doc", () => {
        calls += 1;
        throw new PreconditionFailedError("not allowed");
      })
    ).rejects.toThrowError(PreconditionFailedError);
    expect(calls).toBe(1);
  });

  it("exhausts retry attempts into a CAS conflict error", async () => {
    const kv = new MemoryBlobKv();
    const store = new DocStore(kv);
    await store.create("entity/a", { count: 0 });
    // 每次读取后都注入一个新的更高版本，使写入永远冲突
    let injected = 0;
    const injecting = new InjectingKv(
      kv,
      async (inner) => {
        injected += 1;
        const keys = await inner.list("entity/a/v");
        const latest = keys.length;
        await inner.set(`entity/a/v${latest + 1}`, JSON.stringify({ v: latest + 1, data: { count: 1000 + injected } }));
      },
      false
    );
    const racing = new DocStore(injecting);
    await expect(
      racing.mutate<{ count: number }>("entity/a", (current) => ({ count: (current?.count ?? 0) + 1 }), 3)
    ).rejects.toThrowError(CasConflictError);
  });

  it("deleteAll removes every version of a base key", async () => {
    const kv = new MemoryBlobKv();
    const store = new DocStore(kv);
    await store.create("entity/a", { count: 0 });
    await store.mutate<{ count: number }>("entity/a", (current) => ({ count: (current?.count ?? 0) + 1 }));
    await store.deleteAll("entity/a");
    expect(await store.read("entity/a")).toBeNull();
    expect(await kv.list("entity/a/v")).toEqual([]);
  });

  it("lists base keys under a prefix", async () => {
    const store = new DocStore(new MemoryBlobKv());
    await store.create("logshard/1/2026010110", { items: [] });
    await store.create("logshard/1/2026010111", { items: [] });
    await store.create("logshard/2/2026010110", { items: [] });
    const bases = await store.listBases("logshard/1");
    expect(bases).toEqual(["logshard/1/2026010110", "logshard/1/2026010111"]);
  });
});

describe("IdAllocator", () => {
  it("allocates contiguous unique ids and refills blocks", async () => {
    const kv = new MemoryBlobKv();
    const store = new DocStore(kv);
    const allocator = new IdAllocator(store, "codes", 4);
    const first = await allocator.allocate(10);
    expect(first).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const second = await allocator.allocate(3);
    expect(second).toEqual([11, 12, 13]);
  });

  it("gives disjoint id ranges to independent allocators sharing storage", async () => {
    const kv = new MemoryBlobKv();
    const store = new DocStore(kv);
    const a = new IdAllocator(store, "codes", 4);
    const b = new IdAllocator(store, "codes", 4);
    const [fromA, fromB] = await Promise.all([a.allocate(4), b.allocate(4)]);
    const all = [...fromA, ...fromB];
    expect(new Set(all).size).toBe(8);
  });
});
