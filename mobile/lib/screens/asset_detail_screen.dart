/// 资产账户详情：余额、持仓与流水列表。
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/theme.dart';
import '../models/asset.model.dart';
import '../providers/auth.provider.dart';
import '../services/api.service.dart';
import '../utils/formatters.dart';
import '../utils/toast.dart';

/// 资产详情页参数
class AssetDetailArgs {
  const AssetDetailArgs({required this.accountId, required this.title});

  final String accountId;
  final String title;
}

/// 资产账户详情页
class AssetDetailScreen extends ConsumerStatefulWidget {
  const AssetDetailScreen({
    super.key,
    required this.accountId,
    required this.title,
  });

  final String accountId;
  final String title;

  @override
  ConsumerState<AssetDetailScreen> createState() => _AssetDetailScreenState();
}

class _AssetDetailScreenState extends ConsumerState<AssetDetailScreen> {
  AssetAccount? _account;
  List<AssetTransaction> _txs = <AssetTransaction>[];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_load());
    });
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final String userId = ref.read(userIdProvider);
      final Map<String, dynamic> data = await ref
          .read(apiServiceProvider)
          .getAssetAccountDetail(userId, widget.accountId);
      final AssetAccount account = AssetAccount.fromJson(
        data['account'] as Map<String, dynamic>,
      );
      final List<dynamic> raw =
          data['transactions'] as List<dynamic>? ?? <dynamic>[];
      setState(() {
        _account = account;
        _txs = raw
            .map(
              (dynamic item) =>
                  AssetTransaction.fromJson(item as Map<String, dynamic>),
            )
            .toList();
        _loading = false;
      });
    } on ApiException catch (error) {
      setState(() {
        _loading = false;
        _error = error.message;
      });
      if (mounted) {
        showAppToast(context, error.message);
      }
    } catch (_) {
      setState(() {
        _loading = false;
        _error = '网络连接较慢，请重试';
      });
      if (mounted) {
        showAppToast(context, '网络连接较慢，请重试');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null && _account == null
              ? Center(child: Text(_error!, style: AppTextStyles.body))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(AppDimens.spacingMd),
                    children: <Widget>[
                      if (_account != null) ...<Widget>[
                        Text(
                          '${_account!.icon}  ${_account!.name}',
                          style: AppTextStyles.title,
                        ),
                        const SizedBox(height: AppDimens.spacingSm),
                        Text(
                          '余额 ¥${_account!.balanceYuan}',
                          style: AppTextStyles.body,
                        ),
                        Text(
                          assetTypeLabel(_account!.type),
                          style: AppTextStyles.caption,
                        ),
                        if (_account!.type == AssetAccountType.stock) ...<Widget>[
                          const SizedBox(height: AppDimens.spacingSm),
                          Text(
                            '代码 ${_account!.stockCode ?? '-'} · ${_account!.market ?? '-'}',
                            style: AppTextStyles.caption,
                          ),
                          Text(
                            '持仓 ${_account!.shares} 股 · 成本 ¥${formatYuanFromFen(_account!.costBasis)}',
                            style: AppTextStyles.caption,
                          ),
                        ],
                        const SizedBox(height: AppDimens.spacingLg),
                        const Text('流水', style: AppTextStyles.title),
                        const SizedBox(height: AppDimens.spacingSm),
                      ],
                      if (_txs.isEmpty)
                        const Text('暂无流水', style: AppTextStyles.caption)
                      else
                        ..._txs.map((AssetTransaction tx) {
                          return ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(
                              '${tx.type}  ¥${tx.amountYuan}',
                              style: AppTextStyles.body,
                            ),
                            subtitle: Text(
                              [
                                if (tx.category != null) tx.category!,
                                if (tx.note != null && tx.note!.isNotEmpty)
                                  tx.note!,
                                formatDate(tx.happenedAt.toLocal()),
                              ].join(' · '),
                              style: AppTextStyles.caption,
                            ),
                          );
                        }),
                    ],
                  ),
                ),
    );
  }
}
