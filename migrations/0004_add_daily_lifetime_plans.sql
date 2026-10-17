-- 新增天卡与永久卡套餐
INSERT OR IGNORE INTO plans (code, name, duration_days, sort_order) VALUES
  ('daily', '天卡', 1, 5),
  ('lifetime', '永久卡', 26800, 50);
