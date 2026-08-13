import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:miaochat/config/theme.dart';
import 'package:miaochat/models/budget.model.dart';
import 'package:miaochat/widgets/category_progress_item.dart';
import 'package:miaochat/widgets/progress_ring.dart';

Budget _budget(String status, double percentage) {
  return Budget(
    categoryId: 'c1',
    categoryName: '餐饮',
    categoryIcon: '🍜',
    limitAmount: 200000,
    spentAmount: 32450,
    remainingAmount: 167550,
    percentage: percentage,
    status: status,
  );
}

void main() {
  test('budget status colors match spec', () {
    expect(budgetStatusColor('normal'), AppColors.budgetNormal);
    expect(budgetStatusColor('warning'), AppColors.budgetWarning);
    expect(budgetStatusColor('danger'), AppColors.budgetDanger);
    expect(budgetStatusColor('exceeded'), AppColors.budgetExceeded);
  });

  testWidgets('category row and progress ring render labels', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Column(
            children: <Widget>[
              const ProgressRing(
                percentage: 32.2,
                spentLabel: '804.50',
                goalLabel: '2500.00',
                status: 'normal',
              ),
              CategoryProgressItem(budget: _budget('danger', 96)),
            ],
          ),
        ),
      ),
    );
    await tester.pump();
    expect(find.textContaining('%'), findsOneWidget);
    expect(find.text('餐饮'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 800));
    expect(find.text('32.2%'), findsOneWidget);
  });
}
