import type { AppStatus, CodeStatus, ErrorCode, LogResult } from "./constants";

export type { AppStatus, CodeBulkAction, CodeListStatus, CodeStatus, ErrorCode, LogAction, LogResult } from "./constants";

export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  JWT_SECRET: string;
  CODE_HMAC_SECRET: string;
  APP_SECRET_HMAC_SECRET: string;
  DEVICE_HMAC_SECRET: string;
  ADMIN_BOOTSTRAP_USERNAME?: string;
  ADMIN_BOOTSTRAP_PASSWORD?: string;
};

export type Variables = {
  admin: AdminPrincipal;
};

export type AdminPrincipal = {
  id: number;
  username: string;
};

export type AppRow = {
  id: number;
  app_id: string;
  name: string;
  description: string | null;
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
