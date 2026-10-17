-- 新增两天卡与三天卡套餐
INSERT OR IGNORE INTO plans (code, name, duration_days, sort_order) VALUES
  ('two_day', '两天卡', 2, 6),
  ('three_day', '三天卡', 3, 7);
