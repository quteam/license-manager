import { BlobRepository } from "./blobstore/blob-repository";
import { createSdkBlobKv, DEFAULT_BLOB_NAMESPACE } from "./blobstore/sdk-kv";
import { isEdgeOneRuntime } from "./config";
import { Repository } from "./repository";
import { ApiError, Bindings } from "./types";

/**
 * 存储驱动选择：
 * - Cloudflare Workers：D1 绑定存在 → 现有 SQL Repository；
 * - EdgeOne Pages 云函数：无 D1，按运行时标记走 Blob 驱动（BlobRepository）。
 * BlobRepository 与 Repository 方法契约一致，service 层无感知；
 * 因 Repository 含私有字段的类类型，这里做一次显式桥接转换。
 */
export async function createRepository(env: Bindings): Promise<Repository> {
  if (env.DB) {
    return new Repository(env.DB);
  }
  if (!isEdgeOneRuntime(env)) {
    throw new ApiError(500, "CONFLICT", "Database binding DB is not configured");
  }
  const kv = await createSdkBlobKv(env.BLOB_NAMESPACE || DEFAULT_BLOB_NAMESPACE);
  const repository = await new BlobRepository(kv).ready();
  return repository as unknown as Repository;
}
