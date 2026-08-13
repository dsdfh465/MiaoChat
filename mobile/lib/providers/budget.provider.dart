/// 预算状态：月度进度总览。
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/budget.model.dart';
import '../services/api.service.dart';
import 'auth.provider.dart';

/// 月度预算进度
final budgetProgressProvider =
    FutureProvider.family<BudgetOverview, String>((Ref ref, String month) async {
  final String userId = ref.read(userIdProvider);
  final ApiService api = ref.read(apiServiceProvider);
  return api.getBudgetProgress(userId, month: month);
});
