interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  JWT_SECRET: string;
  CODE_HMAC_SECRET: string;
  APP_SECRET_HMAC_SECRET: string;
  DEVICE_HMAC_SECRET: string;
  ADMIN_BOOTSTRAP_USERNAME?: string;
  ADMIN_BOOTSTRAP_PASSWORD?: string;
}
