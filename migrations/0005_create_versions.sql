-- 新增版本控制（versions 表）
-- 每个应用可发布多个版本；客户端通过 /api/client/versions/latest 查询最新已发布版本。
CREATE TABLE IF NOT EXISTS versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id INTEGER NOT NULL REFERENCES apps(id),
  version TEXT NOT NULL,
  version_code INTEGER NOT NULL CHECK (version_code > 0),
  release_notes TEXT NOT NULL DEFAULT '',
  download_url TEXT NOT NULL DEFAULT '',
  is_forced INTEGER NOT NULL DEFAULT 0 CHECK (is_forced IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TEXT,
  created_by INTEGER REFERENCES admin_users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at TEXT
);

-- 同一应用内，未删除记录的 version_code 唯一（软删除后允许重建）
CREATE UNIQUE INDEX IF NOT EXISTS idx_versions_app_code_active
  ON versions(app_id, version_code) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_versions_app_status ON versions(app_id, status);
CREATE INDEX IF NOT EXISTS idx_versions_app_created_at ON versions(app_id, created_at DESC);
