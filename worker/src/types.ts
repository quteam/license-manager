import type { AdminRole, AppStatus, CodeStatus, ErrorCode, LogResult, TenantStatus, VersionStatus } from "./constants";

export type { AdminRole, AppStatus, CodeBulkAction, CodeListStatus, CodeStatus, ErrorCode, LogAction, LogResult, TenantStatus, VersionStatus } from "./constants";

export type Bindings = {
  /** Cloudflare D1 绑定；EdgeOne 部署时不存在（改用 Blob 存储） */
  DB?: D1Database;
  /** Cloudflare 静态资源绑定；EdgeOne 部署时不存在（静态资源由平台直接托管） */
  ASSETS?: Fetcher;
  JWT_SECRET: string;
  CODE_HMAC_SECRET: string;
  APP_SECRET_HMAC_SECRET: string;
  DEVICE_HMAC_SECRET: string;
  /** base64url 编码的 32 字节 AES-256-GCM 密钥，用于加密激活码明文（可选，未配置时生成不落明文、分销取码不可用） */
  CODE_PLAINTEXT_ENCRYPTION_KEY?: string;
  ADMIN_BOOTSTRAP_USERNAME?: string;
  ADMIN_BOOTSTRAP_PASSWORD?: string;
  /** EdgeOne Blob 命名空间（可选，默认 license-manager） */
  BLOB_NAMESPACE?: string;
  /** EdgeOne 运行时标记：云函数环境注入 / 本地联调可手动置 1 */
  EDGEONE_RUNTIME?: string;
  TENCENTCLOUD_SCF_FUNCTIONNAME?: string;
};

export type Variables = {
  admin: AdminPrincipal;
};

export type AdminPrincipal = {
  id: number;
  username: string;
  role: AdminRole;
  tenant_id: number | null;
  tenant_name: string | null;
};

export type TenantRow = {
  id: number;
  name: string;
  slug: string;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
};

export type AppRow = {
  id: number;
  tenant_id: number;
  tenant_status: TenantStatus;
  app_id: string;
  name: string;
  description: string | null;
  purchase_url: string | null;
  platform: string;
  status: AppStatus;
  app_secret_hash: string;
  created_at: string;
  updated_at: string;
};

export type PlanRow = {
  id: number;
  code: string;
  name: string;
  duration_days: number;
  sort_order: number;
  created_at: string;
};

export type AdminUserRow = {
  id: number;
  tenant_id: number | null;
  role: AdminRole;
  tenant_name: string | null;
  tenant_status: TenantStatus | null;
  username: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
  updated_at: string;
};

export type ActivationCodeRow = {
  id: number;
  batch_id: number | null;
  app_id: number;
  plan_id: number;
  code_hash: string;
  code_suffix: string;
  status: CodeStatus;
  disabled_at: string | null;
  activated_at: string | null;
  expires_at: string | null;
  device_hash: string | null;
  rebind_count: number;
  last_rebind_at: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

export type CodeDetailRow = ActivationCodeRow & {
  app_public_id: string;
  app_name: string;
  app_platform: string;
  app_status: AppStatus;
  plan_code: string;
  plan_name: string;
  duration_days: number;
};

export type VersionRow = {
  id: number;
  app_id: number;
  version: string;
  version_code: number;
  release_notes: string;
  download_url: string;
  is_forced: number;
  status: VersionStatus;
  published_at: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type VersionListItem = VersionRow & {
  app_public_id: string;
  app_name: string;
  tenant_id: number;
};

export type ClientLatestVersion = {
  version: string;
  version_code: number;
  release_notes: string;
  download_url: string;
  is_forced: boolean;
  published_at: string | null;
};

export type DashboardStats = {
  overview: {
    apps_total: number;
    apps_active: number;
    codes_total: number;
    codes_unused: number;
    codes_active: number;
    codes_disabled: number;
    codes_expired: number;
    codes_deleted: number;
    logs_today: number;
    client_failures_today: number;
  };
  code_status: Array<{ status: CodeStatus | "disabled" | "expired"; count: number }>;
  app_code_ranking: Array<{
    app_id: string;
    app_name: string;
    platform: string;
    total: number;
    active: number;
    unused: number;
    disabled: number;
    expired: number;
    deleted: number;
  }>;
  plan_distribution: Array<{ plan_code: string; plan_name: string; count: number }>;
  log_trend: Array<{ date: string; success: number; failure: number }>;
  code_trend: Array<{ date: string; activated: number; expired: number; active: number }>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;

  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
  };
};
