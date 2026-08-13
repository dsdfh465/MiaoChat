/// 梦想基金：月度进度环与分类进度列表。
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/theme.dart';
import '../models/budget.model.dart';
import '../providers/budget.provider.dart';
import '../services/api.service.dart';
import '../utils/formatters.dart';
import '../utils/toast.dart';
import '../widgets/bottom_nav_bar.dart';
import '../widgets/category_progress_item.dart';
import '../widgets/progress_ring.dart';

/// 目标 / 梦想基金页
class TargetScreen extends ConsumerWidget {
  const TargetScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final String month = currentYearMonth();
    final AsyncValue<BudgetOverview> async =
        ref.watch(budgetProgressProvider(month));
    ref.listen<AsyncValue<BudgetOverview>>(budgetProgressProvider(month), (
      AsyncValue<BudgetOverview>? previous,
      AsyncValue<BudgetOverview> next,
    ) {
      next.whenOrNull(
        error: (Object error, StackTrace stack) {
          final String message =
              error is ApiException ? error.message : '网络连接较慢，请重试';
          showAppToast(context, message);
        },
      );
    });
    return Scaffold(
      appBar: AppBar(
        title: const Text('梦想基金'),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (Object error, StackTrace stack) {
          final String message =
              error is ApiException ? error.message : '网络连接较慢，请重试';
          return Center(
            child: Text(message, style: AppTextStyles.body),
          );
        },
        data: (BudgetOverview overview) {
          if (overview.isEmpty) {
            return const Center(
              child: Text(
                '本月尚未设置预算，去设置',
                style: AppTextStyles.body,
              ),
            );
          }
          return ListView(
            padding: const EdgeInsets.all(AppDimens.spacingMd),
            children: <Widget>[
              Center(
                child: ProgressRing(
                  percentage: overview.progressPercentage,
                  spentLabel: overview.totalSpentYuan,
                  goalLabel: overview.totalBudgetYuan,
                  status: overview.status,
                ),
              ),
              const SizedBox(height: AppDimens.spacingLg),
              Row(
                children: <Widget>[
                  _SummaryCell(label: '总预算', value: overview.totalBudgetYuan),
                  _SummaryCell(label: '已花', value: overview.totalSpentYuan),
                  _SummaryCell(label: '剩余', value: overview.totalRemainingYuan),
                ],
              ),
              const SizedBox(height: AppDimens.spacingLg),
              const Text('分类进度', style: AppTextStyles.title),
              const SizedBox(height: AppDimens.spacingSm),
              ...overview.categories.map(
                (Budget item) => CategoryProgressItem(budget: item),
              ),
            ],
          );
        },
      ),
      bottomNavigationBar: const BottomNavBar(currentIndex: 1),
    );
  }
}

class _SummaryCell extends StatelessWidget {
  const _SummaryCell({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: <Widget>[
          Text(label, style: AppTextStyles.caption),
          const SizedBox(height: AppDimens.spacingXs),
          Text(value, style: AppTextStyles.title),
        ],
      ),
    );
  }
}
