CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO tenants (id, name, slug, status)
VALUES (1, '默认租户', 'default', 'active');

ALTER TABLE admin_users ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE admin_users ADD COLUMN role TEXT NOT NULL DEFAULT 'tenant_admin' CHECK (role IN ('super_admin', 'tenant_admin'));
ALTER TABLE apps ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);

UPDATE admin_users SET tenant_id = 1, role = 'super_admin' WHERE tenant_id IS NULL;
UPDATE apps SET tenant_id = 1 WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_admin_users_tenant ON admin_users(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_apps_tenant_created ON apps(tenant_id, created_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_apps_tenant_required_insert
BEFORE INSERT ON apps
WHEN NEW.tenant_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'apps.tenant_id is required');
END;

CREATE TRIGGER IF NOT EXISTS trg_apps_tenant_required_update
BEFORE UPDATE OF tenant_id ON apps
WHEN NEW.tenant_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'apps.tenant_id is required');
END;
