-- 修复 0007 重建表时遗漏的 disabled_at 列（激活/校验 SQL 依赖该列）
ALTER TABLE activation_codes ADD COLUMN disabled_at TEXT;
