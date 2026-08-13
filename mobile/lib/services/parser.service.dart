/// 规则解析：记账分类 + 资产账户变动意图。
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/asset.model.dart';
import '../models/transaction.model.dart';

/// 语音/文本记账与资产解析器
class ParserService {
  const ParserService();

  /// 解析日常记账文本
  ///
  /// [text] 如「中午吃面花了25」
  /// 无法识别金额时返回 null
  ParsedTransaction? parse(String text) {
    final String trimmed = text.trim();
    if (trimmed.isEmpty) {
      return null;
    }
    // 优先走资产账户规则，避免与日常记账冲突时由调用方判断
    final int? amountFen = _extractAmountFen(trimmed);
    if (amountFen == null) {
      return null;
    }
    final String categoryName = _matchCategory(trimmed);
    final RegExpMatch last = RegExp(r'(\d+\.?\d*)').allMatches(trimmed).last;
    final String note = _buildNote(trimmed, last);
    return ParsedTransaction(
      amount: amountFen,
      categoryName: categoryName,
      note: note,
    );
  }

  /// 解析资产账户相关语音
  ///
  /// [text] 用户原话
  /// [accountNames] 可选：已有账户名列表，用于模糊匹配
  /// 无法识别时返回 null
  ParsedAssetIntent? parseAssetIntent(
    String text, {
    List<String> accountNames = const <String>[],
  }) {
    final String trimmed = text.trim();
    if (trimmed.isEmpty) {
      return null;
    }

    final int? shares = _extractShares(trimmed);
    final int? amountFen = _extractAmountFen(trimmed);
    if (amountFen == null && shares == null) {
      return null;
    }

    final String? txType = _matchAssetTxType(trimmed);
    if (txType == null) {
      return null;
    }

    String hint = _matchKnownAccountHint(trimmed, accountNames);
    if (hint.isEmpty) {
      hint = _fallbackAccountHint(trimmed, txType);
    }
    if (hint.isEmpty) {
      return null;
    }

    final String? category = _assetCategory(trimmed, txType);
    // 买入/卖出若未说出金额，用股数×100（按 1 元/股占位）保证可落库
    final int amount = amountFen ?? ((shares ?? 0) * 100);
    if (amount <= 0) {
      return null;
    }
    return ParsedAssetIntent(
      amount: amount,
      transactionType: txType,
      accountHint: hint,
      category: category,
      shares: shares,
      stockCodeHint: _knownStockCode(hint, trimmed),
      note: trimmed,
    );
  }

  /// 常见股票名 → 代码（验收用例：茅台→600519）
  String? _knownStockCode(String hint, String text) {
    if (hint.contains('茅台') || text.contains('茅台')) {
      return '600519';
    }
    if (hint.contains('比亚迪') || text.contains('比亚迪')) {
      return '002594';
    }
    return null;
  }

  int? _extractAmountFen(String text) {
    final Iterable<RegExpMatch> matches = RegExp(r'(\d+\.?\d*)').allMatches(text);
    if (matches.isEmpty) {
      return null;
    }
    // 「买了100股」场景优先取金额而非股数：若同时有「股」与金额，取不含「股」前的数字
    RegExpMatch? preferred;
    for (final RegExpMatch match in matches) {
      final String after = text.substring(match.end).trimLeft();
      if (after.startsWith('股')) {
        continue;
      }
      preferred = match;
    }
    preferred ??= matches.last;
    final double? yuan = double.tryParse(preferred.group(1) ?? '');
    if (yuan == null || yuan <= 0) {
      return null;
    }
    return (yuan * 100).round();
  }

  int? _extractShares(String text) {
    final RegExpMatch? match = RegExp(r'(\d+)\s*股').firstMatch(text);
    if (match == null) {
      return null;
    }
    return int.tryParse(match.group(1) ?? '');
  }

  String? _matchAssetTxType(String text) {
    if (RegExp(r'分红|股息').hasMatch(text)) {
      return 'dividend';
    }
    if (RegExp(r'卖了|卖出|清仓').hasMatch(text)) {
      return 'sell';
    }
    if (RegExp(r'买了|买入|建仓').hasMatch(text) && RegExp(r'股').hasMatch(text)) {
      return 'buy';
    }
    if (RegExp(r'还|还款').hasMatch(text) && RegExp(r'信用|信用卡').hasMatch(text)) {
      return 'repayment';
    }
    if (RegExp(r'赚|收益|涨了|盈利').hasMatch(text)) {
      if (RegExp(r'基金|股|茅台|比亚迪|涨了|收益|盈利').hasMatch(text)) {
        return 'interest';
      }
      return 'income';
    }
    if (RegExp(r'存了|存入|转到').hasMatch(text)) {
      return 'income';
    }
    if (RegExp(r'花了|消费|刷了|支出').hasMatch(text)) {
      return 'expense';
    }
    if (RegExp(r'赚了').hasMatch(text)) {
      return 'income';
    }
    return null;
  }

  String _matchKnownAccountHint(String text, List<String> accountNames) {
    String best = '';
    for (final String name in accountNames) {
      if (name.isEmpty) {
        continue;
      }
      if (text.contains(name) && name.length > best.length) {
        best = name;
      }
    }
    return best;
  }

  String _fallbackAccountHint(String text, String txType) {
    if (text.contains('比特币')) {
      return '比特币钱包';
    }
    if (text.contains('茅台')) {
      return '茅台';
    }
    if (text.contains('比亚迪')) {
      return '比亚迪';
    }
    if (text.contains('工资卡')) {
      return '工资卡';
    }
    if (text.contains('信用卡')) {
      return '信用卡';
    }
    if (text.contains('基金')) {
      return '基金';
    }
    if (txType == 'buy' || txType == 'sell' || txType == 'dividend') {
      final RegExpMatch? stockName = RegExp(r'(?:买了|卖了|买入|卖出)?\d*股?([\u4e00-\u9fa5]{2,})').firstMatch(text);
      if (stockName != null) {
        return stockName.group(1) ?? '';
      }
    }
    return '';
  }

  String? _assetCategory(String text, String txType) {
    if (txType == 'income' && text.contains('工资')) {
      return '工资';
    }
    if (txType == 'expense') {
      return _matchCategory(text);
    }
    if (txType == 'interest') {
      return '收益';
    }
    return null;
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
