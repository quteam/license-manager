-- 支持分销商取码：加明文加密列 + 扩展 status CHECK 加入 issued + 加 issued 字段
-- SQLite 不支持直接改 CHECK 约束，采用「重建表」方式扩展约束并加列

PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS activation_codes_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER REFERENCES activation_batches(id),
  app_id INTEGER NOT NULL REFERENCES apps(id),
  plan_id INTEGER NOT NULL REFERENCES plans(id),
  code_hash TEXT NOT NULL UNIQUE,
  code_suffix TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'issued', 'active', 'deleted')),
  activated_at TEXT,
  expires_at TEXT,
  device_hash TEXT,
  rebind_count INTEGER NOT NULL DEFAULT 0,
  last_rebind_at TEXT,
  code_plaintext_encrypted TEXT,
  issued_at TEXT,
  issued_to TEXT,
  created_by INTEGER REFERENCES admin_users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO activation_codes_new (
  id, batch_id, app_id, plan_id, code_hash, code_suffix, status,
  activated_at, expires_at, device_hash, rebind_count, last_rebind_at,
  code_plaintext_encrypted, issued_at, issued_to,
  created_by, created_at, updated_at
)
SELECT
  id, batch_id, app_id, plan_id, code_hash, code_suffix, status,
  activated_at, expires_at, device_hash, rebind_count, last_rebind_at,
  NULL, NULL, NULL,
  created_by, created_at, updated_at
FROM activation_codes;

DROP TABLE activation_codes;
ALTER TABLE activation_codes_new RENAME TO activation_codes;

CREATE INDEX IF NOT EXISTS idx_codes_app_plan_status ON activation_codes(app_id, plan_id, status);
CREATE INDEX IF NOT EXISTS idx_codes_suffix ON activation_codes(code_suffix);
CREATE INDEX IF NOT EXISTS idx_codes_expires_at ON activation_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_codes_created_at ON activation_codes(created_at DESC);

PRAGMA foreign_keys=ON;
