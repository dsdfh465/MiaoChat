import 'package:flutter_test/flutter_test.dart';
import 'package:miaochat/utils/formatters.dart';
import 'package:miaochat/utils/validators.dart';

void main() {
  test('formats fen to yuan string', () {
    expect(formatYuanFromFen(2500), '25.00');
    expect(formatYuanFromFen(1850), '18.50');
    expect(formatYuanFromFen(0), '0.00');
  });

  test('formats current year month and date', () {
    final DateTime date = DateTime(2026, 8, 13);
    expect(currentYearMonth(date), '2026-08');
    expect(formatDate(date), '2026-08-13');
    expect(isSameDay(date, DateTime(2026, 8, 13, 23, 59)), isTrue);
  });

  test('validates month and personality', () {
    expect(isYearMonth('2026-08'), isTrue);
    expect(isYearMonth('2026-8'), isFalse);
    expect(isPersonality('strict'), isTrue);
    expect(isPersonality('unknown'), isFalse);
  });
}
