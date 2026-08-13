/// 资产账户与总览模型，金额以分为单位。
library;

/// 资产账户类型
enum AssetAccountType {
  deposit,
  credit,
  fund,
  stock,
  other,
}

/// 解析/展示用类型标签
String assetTypeLabel(AssetAccountType type) {
  switch (type) {
    case AssetAccountType.deposit:
      return '银行存款';
    case AssetAccountType.credit:
      return '信用卡';
    case AssetAccountType.fund:
      return '基金';
    case AssetAccountType.stock:
      return '股票';
    case AssetAccountType.other:
      return '其他资产';
  }
}

/// 从字符串解析类型
AssetAccountType parseAssetAccountType(String raw) {
  switch (raw) {
    case 'credit':
      return AssetAccountType.credit;
    case 'fund':
      return AssetAccountType.fund;
    case 'stock':
      return AssetAccountType.stock;
    case 'other':
      return AssetAccountType.other;
    default:
      return AssetAccountType.deposit;
  }
}

/// 单个资产账户
class AssetAccount {
  const AssetAccount({
    required this.id,
    required this.name,
    required this.type,
    required this.balance,
    required this.icon,
    required this.isActive,
    required this.isPositive,
    this.stockCode,
    this.market,
    this.shares = 0,
    this.costBasis = 0,
    this.balanceYuan = '0.00',
  });

  final String id;
  final String name;
  final AssetAccountType type;
  final int balance;
  final String icon;
  final bool isActive;
  final bool isPositive;
  final String? stockCode;
  final String? market;
  final int shares;
  final int costBasis;
  final String balanceYuan;

  /// 从 API JSON 构造
  factory AssetAccount.fromJson(Map<String, dynamic> json) {
    return AssetAccount(
      id: json['id'] as String,
      name: json['name'] as String,
      type: parseAssetAccountType(json['type'] as String? ?? 'deposit'),
      balance: (json['balance'] as num).toInt(),
      icon: json['icon'] as String? ?? '💰',
      isActive: json['is_active'] as bool? ?? true,
      isPositive: json['is_positive'] as bool? ?? true,
      stockCode: json['stock_code'] as String?,
      market: json['market'] as String?,
      shares: (json['shares'] as num?)?.toInt() ?? 0,
      costBasis: (json['cost_basis'] as num?)?.toInt() ?? 0,
      balanceYuan: json['balance_yuan'] as String? ?? '0.00',
    );
  }
}

/// 资产总览
class AssetOverview {
  const AssetOverview({
    required this.accounts,
    required this.totalAssets,
    required this.totalAssetsYuan,
    required this.summary,
  });

  final List<AssetAccount> accounts;
  final int totalAssets;
  final String totalAssetsYuan;
  final Map<String, int> summary;

  /// 从 GET /asset-accounts 的 data 构造
  factory AssetOverview.fromJson(Map<String, dynamic> json) {
    final List<dynamic> raw =
        json['accounts'] as List<dynamic>? ?? <dynamic>[];
    final Map<String, dynamic> summaryRaw =
        json['summary'] as Map<String, dynamic>? ?? <String, dynamic>{};
    return AssetOverview(
      accounts: raw
          .map(
            (dynamic item) =>
                AssetAccount.fromJson(item as Map<String, dynamic>),
          )
          .toList(),
      totalAssets: (json['total_assets'] as num?)?.toInt() ?? 0,
      totalAssetsYuan: json['total_assets_yuan'] as String? ?? '0.00',
      summary: <String, int>{
        'deposit': (summaryRaw['deposit'] as num?)?.toInt() ?? 0,
        'credit': (summaryRaw['credit'] as num?)?.toInt() ?? 0,
        'fund': (summaryRaw['fund'] as num?)?.toInt() ?? 0,
        'stock': (summaryRaw['stock'] as num?)?.toInt() ?? 0,
        'other': (summaryRaw['other'] as num?)?.toInt() ?? 0,
      },
    );
  }
}

/// 资产流水
class AssetTransaction {
  const AssetTransaction({
    required this.id,
    required this.accountId,
    required this.amount,
    required this.balanceAfter,
    required this.type,
    required this.amountYuan,
    this.category,
    this.note,
    required this.happenedAt,
  });

  final String id;
  final String accountId;
  final int amount;
  final int balanceAfter;
  final String type;
  final String amountYuan;
  final String? category;
  final String? note;
  final DateTime happenedAt;

  /// 从 JSON 构造
  factory AssetTransaction.fromJson(Map<String, dynamic> json) {
    return AssetTransaction(
      id: json['id'] as String,
      accountId: json['account_id'] as String,
      amount: (json['amount'] as num).toInt(),
      balanceAfter: (json['balance_after'] as num).toInt(),
      type: json['type'] as String,
      amountYuan: json['amount_yuan'] as String? ?? '0.00',
      category: json['category'] as String?,
      note: json['note'] as String?,
      happenedAt: DateTime.parse(json['happened_at'] as String),
    );
  }
}

/// 语音解析出的资产变动意图
class ParsedAssetIntent {
  const ParsedAssetIntent({
    required this.amount,
    required this.transactionType,
    required this.accountHint,
    this.category,
    this.shares,
    this.stockCodeHint,
    this.note = '',
  });

  final int amount;
  final String transactionType;
  final String accountHint;
  final String? category;
  final int? shares;
  /// 已知股票名映射出的代码（如茅台→600519），用于匹配账户
  final String? stockCodeHint;
  final String note;
}
