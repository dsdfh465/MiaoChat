/// 规则解析：从语音文本提取金额（分）、分类与备注。
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/transaction.model.dart';

/// 语音/文本记账解析器
class ParserService {
  const ParserService();

  /// 解析用户语音转写文本
  ///
  /// [text] 如「中午吃面花了25」
  /// 无法识别金额时返回 null
  ParsedTransaction? parse(String text) {
    final String trimmed = text.trim();
    if (trimmed.isEmpty) {
      return null;
    }

    final RegExp amountPattern = RegExp(r'(\d+\.?\d*)');
    final Iterable<RegExpMatch> matches = amountPattern.allMatches(trimmed);
    if (matches.isEmpty) {
      return null;
    }
    final RegExpMatch last = matches.last;
    final double? yuan = double.tryParse(last.group(1) ?? '');
    if (yuan == null || yuan <= 0) {
      return null;
    }
    final int amount = (yuan * 100).round();
    final String categoryName = _matchCategory(trimmed);
    final String note = _buildNote(trimmed, last);
    return ParsedTransaction(
      amount: amount,
      categoryName: categoryName,
      note: note,
    );
  }

  String _matchCategory(String text) {
    if (RegExp(r'吃|面|饭|餐厅').hasMatch(text)) {
      return '餐饮';
    }
    if (RegExp(r'车|公交|地铁|打车').hasMatch(text)) {
      return '交通';
    }
    if (RegExp(r'买|购|店').hasMatch(text)) {
      return '购物';
    }
    return '其他';
  }

  String _buildNote(String text, RegExpMatch amountMatch) {
    String note = text.replaceRange(amountMatch.start, amountMatch.end, '');
    note = note.replaceAll(RegExp(r'花了|块钱|元|块'), '');
    note = note.replaceAll(RegExp(r'\s+'), '');
    if (note.isEmpty) {
      return text.trim();
    }
    return note;
  }
}

/// 解析器 Provider
final parserServiceProvider = Provider<ParserService>((Ref _) {
  return const ParserService();
});
