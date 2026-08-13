/// 预算进度模型，金额以分为单位。
library;

/// 单个分类的预算进度
class Budget {
  const Budget({
    required this.categoryId,
    required this.categoryName,
    required this.categoryIcon,
    required this.limitAmount,
    required this.spentAmount,
    required this.remainingAmount,
    required this.percentage,
    required this.status,
  });

  final String categoryId;
  final String categoryName;
  final String categoryIcon;
  final int limitAmount;
  final int spentAmount;
  final int remainingAmount;
  final double percentage;
  final String status;

  double get limitYuan => limitAmount / 100;
  double get spentYuan => spentAmount / 100;
  double get remainingYuan => remainingAmount / 100;

  /// 从后端 categories[] 项构造
  ///
  /// [json] 分类进度对象
  factory Budget.fromJson(Map<String, dynamic> json) {
    return Budget(
      categoryId: json['category_id'] as String,
      categoryName: json['category_name'] as String,
      categoryIcon: json['category_icon'] as String,
      limitAmount: (json['limit_amount'] as num).toInt(),
      spentAmount: (json['spent_amount'] as num).toInt(),
      remainingAmount: (json['remaining_amount'] as num).toInt(),
      percentage: (json['percentage'] as num).toDouble(),
      status: json['status'] as String,
    );
  }
}

/// 月度预算总览（进度环 + 分类列表）
class BudgetOverview {
  const BudgetOverview({
    required this.month,
    required this.totalBudget,
    required this.totalSpent,
    required this.totalRemaining,
    required this.progressPercentage,
    required this.status,
    required this.totalBudgetYuan,
    required this.totalSpentYuan,
    required this.totalRemainingYuan,
    required this.categories,
  });

  final String month;
  final int totalBudget;
  final int totalSpent;
  final int totalRemaining;
  final double progressPercentage;
  final String status;
  final String totalBudgetYuan;
  final String totalSpentYuan;
  final String totalRemainingYuan;
  final List<Budget> categories;

  /// 是否尚未设置任何预算
  bool get isEmpty => categories.isEmpty || totalBudget == 0;

  /// 从 GET /budgets/progress 的 data 构造
  ///
  /// [json] 接口 data
  factory BudgetOverview.fromJson(Map<String, dynamic> json) {
    final Map<String, dynamic> overview =
        json['overview'] as Map<String, dynamic>;
    final List<dynamic> rawCategories =
        json['categories'] as List<dynamic>? ?? <dynamic>[];
    return BudgetOverview(
      month: json['month'] as String,
      totalBudget: (overview['total_budget'] as num).toInt(),
      totalSpent: (overview['total_spent'] as num).toInt(),
      totalRemaining: (overview['total_remaining'] as num).toInt(),
      progressPercentage: (overview['progress_percentage'] as num).toDouble(),
      status: overview['status'] as String,
      totalBudgetYuan: overview['total_budget_yuan'] as String? ?? '0.00',
      totalSpentYuan: overview['total_spent_yuan'] as String? ?? '0.00',
      totalRemainingYuan: overview['total_remaining_yuan'] as String? ?? '0.00',
      categories: rawCategories
          .map(
            (dynamic item) => Budget.fromJson(item as Map<String, dynamic>),
          )
          .toList(),
    );
  }
}
