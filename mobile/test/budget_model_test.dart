import 'package:flutter_test/flutter_test.dart';
import 'package:miaochat/models/budget.model.dart';

void main() {
  test('parses budget progress overview and empty month', () {
    final BudgetOverview overview = BudgetOverview.fromJson(<String, dynamic>{
      'month': '2026-09',
      'overview': <String, dynamic>{
        'total_budget': 250000,
        'total_budget_yuan': '2500.00',
        'total_spent': 80450,
        'total_spent_yuan': '804.50',
        'total_remaining': 169550,
        'total_remaining_yuan': '1695.50',
        'progress_percentage': 32.2,
        'status': 'normal',
      },
      'categories': <Map<String, dynamic>>[
        <String, dynamic>{
          'category_id': 'c1',
          'category_name': '餐饮',
          'category_icon': '🍜',
          'limit_amount': 200000,
          'spent_amount': 32450,
          'remaining_amount': 167550,
          'percentage': 16.2,
          'status': 'normal',
        },
      ],
    });
    expect(overview.isEmpty, isFalse);
    expect(overview.progressPercentage, 32.2);
    expect(overview.categories.single.status, 'normal');

    final BudgetOverview empty = BudgetOverview.fromJson(<String, dynamic>{
      'month': '2026-08',
      'overview': <String, dynamic>{
        'total_budget': 0,
        'total_spent': 0,
        'total_remaining': 0,
        'progress_percentage': 0,
        'status': 'normal',
      },
      'categories': <dynamic>[],
    });
    expect(empty.isEmpty, isTrue);
  });
}
