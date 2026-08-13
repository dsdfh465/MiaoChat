import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:miaochat/models/transaction.model.dart';
import 'package:miaochat/widgets/confirm_card.dart';

void main() {
  testWidgets('confirm card swipe right confirms and left edits category', (
    WidgetTester tester,
  ) async {
    bool confirmed = false;
    bool edited = false;
    const ParsedTransaction draft = ParsedTransaction(
      amount: 2500,
      categoryName: '餐饮',
      note: '中午吃面',
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ConfirmCard(
            draft: draft,
            confirmed: false,
            onConfirm: () => confirmed = true,
            onEditCategory: () => edited = true,
          ),
        ),
      ),
    );

    expect(find.text('滑动确认记账'), findsOneWidget);
    expect(find.textContaining('餐饮'), findsOneWidget);

    await tester.drag(find.byType(ConfirmCard), const Offset(120, 0));
    await tester.pumpAndSettle();
    expect(confirmed, isTrue);

    await tester.drag(find.byType(ConfirmCard), const Offset(-120, 0));
    await tester.pumpAndSettle();
    expect(edited, isTrue);
  });
}
