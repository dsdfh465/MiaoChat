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
}
