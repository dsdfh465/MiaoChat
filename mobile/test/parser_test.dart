import 'package:flutter_test/flutter_test.dart';
import 'package:miaochat/services/parser.service.dart';

void main() {
  const ParserService parser = ParserService();

  test('parses lunch noodle expense as dining', () {
    final result = parser.parse('中午吃面花了25');
    expect(result, isNotNull);
    expect(result!.amount, 2500);
    expect(result.categoryName, '餐饮');
    expect(result.note, contains('中午吃面'));
  });

  test('parses shopping amount in yuan', () {
    final result = parser.parse('买衣服300块');
    expect(result, isNotNull);
    expect(result!.amount, 30000);
    expect(result.categoryName, '购物');
  });

  test('parses taxi decimal amount as transport', () {
    final result = parser.parse('打车18.5');
    expect(result, isNotNull);
    expect(result!.amount, 1850);
    expect(result.categoryName, '交通');
  });

  test('defaults to other when no category keyword', () {
    final result = parser.parse('随便记一笔40');
    expect(result, isNotNull);
    expect(result!.categoryName, '其他');
  });

  test('returns null when amount missing', () {
    expect(parser.parse('中午吃面'), isNull);
  });

  test('parses payroll deposit into wage card', () {
    final intent = parser.parseAssetIntent(
      '工资卡存了5000',
      accountNames: <String>['工资卡', '信用卡'],
    );
    expect(intent, isNotNull);
    expect(intent!.amount, 500000);
    expect(intent.transactionType, 'income');
    expect(intent.accountHint, '工资卡');
    expect(intent.category, '工资');
  });

  test('parses credit card expense', () {
    final intent = parser.parseAssetIntent('信用卡花了300吃饭');
    expect(intent, isNotNull);
    expect(intent!.amount, 30000);
    expect(intent.transactionType, 'expense');
    expect(intent.accountHint, '信用卡');
    expect(intent.category, '餐饮');
  });

  test('parses fund interest', () {
    final intent = parser.parseAssetIntent('基金赚了100');
    expect(intent, isNotNull);
    expect(intent!.amount, 10000);
    expect(intent.transactionType, 'interest');
    expect(intent.accountHint, '基金');
  });

  test('parses credit repayment', () {
    final intent = parser.parseAssetIntent('还信用卡2000');
    expect(intent, isNotNull);
    expect(intent!.amount, 200000);
    expect(intent.transactionType, 'repayment');
  });

  test('parses stock buy with shares and maotai hint', () {
    final intent = parser.parseAssetIntent('买了100股茅台');
    expect(intent, isNotNull);
    expect(intent!.transactionType, 'buy');
    expect(intent.shares, 100);
    expect(intent.accountHint, contains('茅台'));
    expect(intent.stockCodeHint, '600519');
  });

  test('parses bitcoin wallet income as other account hint', () {
    final intent = parser.parseAssetIntent('比特币钱包赚了1000');
    expect(intent, isNotNull);
    expect(intent!.amount, 100000);
    expect(intent.accountHint, '比特币钱包');
  });
}
