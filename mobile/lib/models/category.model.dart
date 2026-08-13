/// 系统预设分类，供确认卡片左滑改分类使用。
library;

/// 分类选项
class CategoryOption {
  const CategoryOption({
    required this.name,
    required this.icon,
  });

  final String name;
  final String icon;
}

/// 与后端种子分类一致
const List<CategoryOption> kSystemCategories = <CategoryOption>[
  CategoryOption(name: '餐饮', icon: '🍜'),
  CategoryOption(name: '购物', icon: '🛍️'),
  CategoryOption(name: '交通', icon: '🚇'),
  CategoryOption(name: '娱乐', icon: '🎮'),
  CategoryOption(name: '居住', icon: '🏠'),
  CategoryOption(name: '医疗', icon: '💊'),
  CategoryOption(name: '教育', icon: '📚'),
  CategoryOption(name: '人情', icon: '🧧'),
  CategoryOption(name: '其他', icon: '📌'),
];
