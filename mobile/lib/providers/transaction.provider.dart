/// 交易状态：月度列表与今日支出。
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/transaction.model.dart';
import '../services/api.service.dart';
import '../utils/formatters.dart';
import 'auth.provider.dart';
import 'budget.provider.dart';

/// 月度交易列表
final transactionsProvider =
    FutureProvider.family<List<Transaction>, String>((Ref ref, String month) async {
  final String userId = ref.read(userIdProvider);
  final ApiService api = ref.read(apiServiceProvider);
  return api.getTransactions(userId, month: month);
});

/// 今日已确认支出（分）
final todayExpenseProvider = FutureProvider<int>((Ref ref) async {
  final String month = currentYearMonth();
  final List<Transaction> list =
      await ref.watch(transactionsProvider(month).future);
  final DateTime today = DateTime.now();
  int total = 0;
  for (final Transaction item in list) {
    if (!item.isConfirmed || item.amount <= 0) {
      continue;
    }
    if (isSameDay(item.recordedAt.toLocal(), today)) {
      total += item.amount;
    }
  }
  return total;
});

/// 创建交易并刷新列表
///
/// [ref] Riverpod 引用
/// [params] 记账参数
Future<Transaction> createTransaction(
  WidgetRef ref,
  CreateTransactionParams params,
) async {
  final String userId = ref.read(userIdProvider);
  final ApiService api = ref.read(apiServiceProvider);
  final Transaction created = await api.createTransaction(userId, params);
  ref.invalidate(transactionsProvider);
  ref.invalidate(todayExpenseProvider);
  ref.invalidate(budgetProgressProvider);
  return created;
}
