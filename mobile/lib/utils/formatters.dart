/// 金额与日期格式化，金额以分为整数避免浮点误差。
library;

/// 将分格式化为元字符串，如 2500 → "25.00"
///
/// [amountFen] 金额（分），可为负
String formatYuanFromFen(int amountFen) {
  final String sign = amountFen < 0 ? '-' : '';
  final int abs = amountFen.abs();
  final int yuan = abs ~/ 100;
  final int cents = abs % 100;
  return '$sign$yuan.${cents.toString().padLeft(2, '0')}';
}

/// 当前月份 YYYY-MM
///
/// [now] 可选，默认本机当前时间
String currentYearMonth([DateTime? now]) {
  final DateTime date = now ?? DateTime.now();
  final String month = date.month.toString().padLeft(2, '0');
  return '${date.year}-$month';
}

/// 格式化注册/记账日期为 yyyy-MM-dd
///
/// [date] 日期时间
String formatDate(DateTime date) {
  final String month = date.month.toString().padLeft(2, '0');
  final String day = date.day.toString().padLeft(2, '0');
  return '${date.year}-$month-$day';
}

/// 判断两个日期是否为同一天（本地时区）
///
/// [left] 与 [right] 待比较日期
bool isSameDay(DateTime left, DateTime right) {
  return left.year == right.year &&
      left.month == right.month &&
      left.day == right.day;
}
