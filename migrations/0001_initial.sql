PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS apps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  app_secret_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS activation_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id INTEGER NOT NULL REFERENCES apps(id),
  plan_id INTEGER NOT NULL REFERENCES plans(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  note TEXT,
  created_by INTEGER REFERENCES admin_users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS activation_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER REFERENCES activation_batches(id),
  app_id INTEGER NOT NULL REFERENCES apps(id),
  plan_id INTEGER NOT NULL REFERENCES plans(id),
  code_hash TEXT NOT NULL UNIQUE,
  code_suffix TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'active', 'deleted')),
  disabled_at TEXT,
  activated_at TEXT,
  expires_at TEXT,
  device_hash TEXT,
  rebind_count INTEGER NOT NULL DEFAULT 0,
  last_rebind_at TEXT,
  created_by INTEGER REFERENCES admin_users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS activation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_id INTEGER REFERENCES activation_codes(id),
  app_id INTEGER REFERENCES apps(id),
  action TEXT NOT NULL,
  result TEXT NOT NULL,
  device_hash TEXT,
  error_code TEXT,
  message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_apps_app_id ON apps(app_id);
CREATE INDEX IF NOT EXISTS idx_codes_app_plan_status ON activation_codes(app_id, plan_id, status);
CREATE INDEX IF NOT EXISTS idx_codes_suffix ON activation_codes(code_suffix);
CREATE INDEX IF NOT EXISTS idx_codes_expires_at ON activation_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_codes_created_at ON activation_codes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_code_created_at ON activation_logs(code_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_app_created_at ON activation_logs(app_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON activation_logs(created_at DESC);

INSERT OR IGNORE INTO plans (code, name, duration_days, sort_order) VALUES
  ('weekly', '周卡', 7, 10),
  ('monthly', '月卡', 30, 20),
  ('quarterly', '季卡', 90, 30),
  ('yearly', '年卡', 365, 40);
