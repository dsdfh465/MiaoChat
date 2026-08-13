/// 账目交易模型，金额以分为单位。
library;

/// 创建交易请求参数
class CreateTransactionParams {
  const CreateTransactionParams({
    required this.amount,
    required this.categoryName,
    this.note = '',
    this.recordedAt,
  });

  /// 金额（分）
  final int amount;

  /// 分类名称
  final String categoryName;

  /// 备注
  final String note;

  /// 记账时间，空则由服务端填当前时间
  final DateTime? recordedAt;
}

/// 语音解析结果
class ParsedTransaction {
  const ParsedTransaction({
    required this.amount,
    required this.categoryName,
    required this.note,
  });

  final int amount;
  final String categoryName;
  final String note;

  /// 复制并覆盖分类
  ParsedTransaction copyWith({
    int? amount,
    String? categoryName,
    String? note,
  }) {
    return ParsedTransaction(
      amount: amount ?? this.amount,
      categoryName: categoryName ?? this.categoryName,
      note: note ?? this.note,
    );
  }
}

/// 账目记录
class Transaction {
  const Transaction({
    required this.id,
    required this.categoryId,
    required this.categoryName,
    required this.categoryIcon,
    required this.amount,
    required this.note,
    required this.recordedAt,
    required this.source,
    required this.isConfirmed,
  });

  final String id;
  final String categoryId;
  final String categoryName;
  final String categoryIcon;

  /// 金额（分）
  final int amount;
  final String note;
  final DateTime recordedAt;
  final String source;
  final bool isConfirmed;

  /// 金额（元）
  double get amountYuan => amount / 100;

  /// 从后端 JSON 构造
  ///
  /// [json] API data 对象
  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'] as String,
      categoryId: json['category_id'] as String,
      categoryName: json['category_name'] as String? ?? '其他',
      categoryIcon: json['category_icon'] as String? ?? '📌',
      amount: (json['amount'] as num).toInt(),
      note: json['note'] as String? ?? '',
      recordedAt: DateTime.parse(json['recorded_at'] as String),
      source: json['source'] as String? ?? 'voice',
      isConfirmed: json['is_confirmed'] as bool? ?? true,
    );
  }

  /// 转为 JSON（本地缓存预留）
  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'category_id': categoryId,
      'category_name': categoryName,
      'category_icon': categoryIcon,
      'amount': amount,
      'note': note,
      'recorded_at': recordedAt.toIso8601String(),
      'source': source,
      'is_confirmed': isConfirmed,
    };
  }
}
