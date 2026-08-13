-- 系统预设分类种子（可重复执行）
-- 在 Supabase Dashboard -> SQL Editor 中执行；后端启动时也会自动补齐

INSERT INTO categories (user_id, name, icon, is_system)
SELECT NULL, v.name, v.icon, true
FROM (
  VALUES
    ('餐饮', '🍜'),
    ('购物', '🛍️'),
    ('交通', '🚇'),
    ('娱乐', '🎮'),
    ('居住', '🏠'),
    ('医疗', '💊'),
    ('教育', '📚'),
    ('人情', '🧧'),
    ('其他', '📌')
) AS v(name, icon)
WHERE NOT EXISTS (
  SELECT 1
  FROM categories c
  WHERE c.is_system = true
    AND c.name = v.name
);
