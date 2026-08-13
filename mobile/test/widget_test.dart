import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:miaochat/main.dart';
import 'package:miaochat/models/budget.model.dart';
import 'package:miaochat/models/user.model.dart';
import 'package:miaochat/providers/auth.provider.dart';
import 'package:miaochat/providers/budget.provider.dart';
import 'package:miaochat/providers/transaction.provider.dart';

final User _fakeUser = User(
  id: 'c036458e-167d-4f51-9f3b-7cb2430a536f',
  phone: '13800138000',
  personality: 'gentle',
  createdAt: DateTime(2026, 8, 13),
);

const BudgetOverview _emptyBudget = BudgetOverview(
  month: '2026-08',
  totalBudget: 0,
  totalSpent: 0,
  totalRemaining: 0,
  progressPercentage: 0,
  status: 'normal',
  totalBudgetYuan: '0.00',
  totalSpentYuan: '0.00',
  totalRemainingYuan: '0.00',
  categories: <Budget>[],
);

Widget _testApp() {
  return ProviderScope(
    overrides: <Override>[
      todayExpenseProvider.overrideWith((Ref ref) async => 2500),
      userProvider.overrideWith((Ref ref) async => _fakeUser),
      budgetProgressProvider.overrideWith(
        (Ref ref, String month) async => _emptyBudget,
      ),
    ],
    child: const MyApp(),
  );
}

void main() {
  testWidgets('home screen shows title and voice prompt', (WidgetTester tester) async {
    await tester.pumpWidget(_testApp());
    await tester.pump();
    await tester.pump();

    expect(find.text('妙语记账'), findsWidgets);
    expect(find.textContaining('按住说话'), findsWidgets);
    expect(find.text('妙语'), findsOneWidget);
    expect(find.text('目标'), findsOneWidget);
    expect(find.text('我的'), findsOneWidget);
    expect(find.text('今日支出 25.00 元'), findsOneWidget);
  });

  testWidgets('home text input parses and shows confirm card', (WidgetTester tester) async {
    await tester.pumpWidget(_testApp());
    await tester.pump();
    await tester.pump();

    await tester.enterText(find.byType(TextField), '中午吃面花了25');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();

    expect(find.text('滑动确认记账'), findsOneWidget);
    expect(find.textContaining('餐饮'), findsWidgets);
    expect(find.textContaining('中午吃面'), findsWidgets);
  });

  testWidgets('bottom tabs navigate between screens', (WidgetTester tester) async {
    await tester.pumpWidget(_testApp());
    await tester.pump();

    await tester.tap(find.text('目标'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('梦想基金'), findsWidgets);
    expect(find.text('本月尚未设置预算，去设置'), findsOneWidget);

    await tester.tap(find.text('我的').last);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('13800138000'), findsOneWidget);
    expect(find.textContaining('注册时间'), findsOneWidget);
    expect(find.text('严师'), findsOneWidget);
    expect(find.text('导出数据'), findsOneWidget);
  });
}
