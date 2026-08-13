/// 输入校验工具。
library;

/// 月份是否为 YYYY-MM
///
/// [value] 待校验字符串
bool isYearMonth(String value) {
  return RegExp(r'^\d{4}-\d{2}$').hasMatch(value);
}

/// 人格值是否合法
///
/// [value] strict / gentle / buddha
bool isPersonality(String value) {
  return value == 'strict' || value == 'gentle' || value == 'buddha';
}
