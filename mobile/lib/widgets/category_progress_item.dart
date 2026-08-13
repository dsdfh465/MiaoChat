/// 分类预算进度条目：图标、名称、进度条、已花/预算。
library;

import 'package:flutter/material.dart';

import '../config/theme.dart';
import '../models/budget.model.dart';
import '../utils/formatters.dart';

/// 单行分类进度
class CategoryProgressItem extends StatelessWidget {
  const CategoryProgressItem({
    super.key,
    required this.budget,
  });

  final Budget budget;

  @override
  Widget build(BuildContext context) {
    final double ratio = (budget.percentage / 100).clamp(0, 1);
    final Color color = budgetStatusColor(budget.status);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppDimens.spacingSm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Text(budget.categoryIcon, style: AppTextStyles.body),
              const SizedBox(width: AppDimens.spacingSm),
              Expanded(
                child: Text(budget.categoryName, style: AppTextStyles.body),
              ),
              Text(
                '${formatYuanFromFen(budget.spentAmount)} / ${formatYuanFromFen(budget.limitAmount)}',
                style: AppTextStyles.caption,
              ),
            ],
          ),
          const SizedBox(height: AppDimens.spacingXs),
          ClipRRect(
            borderRadius: BorderRadius.circular(AppDimens.categoryBarHeight),
            child: LinearProgressIndicator(
              value: ratio,
              minHeight: AppDimens.categoryBarHeight,
              color: color,
              backgroundColor: AppColors.ringTrack,
            ),
          ),
        ],
      ),
    );
  }
}
