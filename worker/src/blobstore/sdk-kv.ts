import type { BlobKv } from "./kv";

/**
 * EdgeOne Pages Blob SDK（@edgeone/pages-blob）适配器。
 * SDK 行为要点（以 dist/index.d.ts 为准）：
 * - get(key, { type, consistency })：第二参是选项对象；不传 type 默认 "text"；
 * - set(key, value, { onlyIfNew })：返回 void；onlyIfNew 冲突时抛
 *   PreconditionFailedError（code = "PRECONDITION_FAILED"），成功不抛；
 * - list({ prefix })：返回 { blobs: [{ key }], directories, cursor? }，
 *   默认自动聚合全部分页。
 * Store 级 consistency: "strong" 保证读己之写（官方要求作为数据库使用时必须开启）。
 */
export const DEFAULT_BLOB_NAMESPACE = "license-manager";

type EdgeOneBlobStore = {
  get(key: string, options?: { type?: string; consistency?: string }): Promise<unknown>;
  set(key: string, value: unknown, options?: { onlyIfNew?: boolean; cacheControl?: string | null }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; directories?: boolean; cursor?: string; limit?: number; paginate?: boolean }): Promise<{
    blobs?: Array<{ key?: string }>;
    directories?: string[];
    cursor?: string;
  }>;
};

type PagesBlobModule = {
  getStore(options: { name: string; consistency?: string }): EdgeOneBlobStore;
};

const kvCache = new Map<string, BlobKv>();

export async function createSdkBlobKv(namespace: string): Promise<BlobKv> {
  const cached = kvCache.get(namespace);
  if (cached) {
    return cached;
  }
  const kv = await createSdkBlobKvOnce(namespace);
  kvCache.set(namespace, kv);
  return kv;
}

async function createSdkBlobKvOnce(namespace: string): Promise<BlobKv> {
  // SDK 在 EdgeOne 云函数运行时内注入凭据；动态导入以避免影响 Cloudflare 构建
  const mod = (await import("@edgeone/pages-blob")) as unknown as PagesBlobModule;
  const store = mod.getStore({ name: namespace, consistency: "strong" });

  return {
    async get(key: string): Promise<string | null> {
      const value = await store.get(key, { type: "text" });
      return typeof value === "string" ? value : null;
    },
    async set(key: string, value: string, options?: { onlyIfNew?: boolean }): Promise<boolean> {
      try {
        await store.set(key, value, options);
        return true;
      } catch (error) {
        if (error && typeof error === "object" && (error as { code?: string }).code === "PRECONDITION_FAILED") {
          return false;
        }
        throw error;
      }
    },
    async delete(key: string): Promise<void> {
      await store.delete(key);
    },
    async list(prefix: string): Promise<string[]> {
      const page = await store.list({ prefix });
      const keys: string[] = [];
      for (const blob of page.blobs ?? []) {
        if (typeof blob?.key === "string") {
          keys.push(blob.key);
        }
      }
      return keys.sort();
    }
  };
}
