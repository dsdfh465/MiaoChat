/// 「我的」页：用户信息、人格切换与 CSV 导出。
library;

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../config/theme.dart';
import '../models/asset.model.dart';
import '../models/user.model.dart';
import '../providers/asset.provider.dart';
import '../providers/auth.provider.dart';
import '../routes/app_router.dart';
import '../screens/asset_detail_screen.dart';
import '../services/api.service.dart';
import '../utils/formatters.dart';
import '../utils/toast.dart';
import '../widgets/bottom_nav_bar.dart';
import '../widgets/personality_selector.dart';

/// 「我的」页面
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _exporting = false;

  Future<void> _changePersonality(String value) async {
    try {
      final String userId = ref.read(userIdProvider);
      await ref.read(apiServiceProvider).updatePersonality(userId, value);
      ref.invalidate(userProvider);
      if (!mounted) {
        return;
      }
      showAppToast(context, '人格已更新');
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      showAppToast(context, error.message);
    } catch (_) {
      if (!mounted) {
        return;
      }
      showAppToast(context, '网络连接较慢，请重试');
    }
  }

  Future<void> _export() async {
    if (_exporting) {
      return;
    }
    setState(() {
      _exporting = true;
    });
    try {
      final String userId = ref.read(userIdProvider);
      final String csv =
          await ref.read(apiServiceProvider).exportTransactions(userId);
      final List<String> lines = csv
          .replaceFirst('\uFEFF', '')
          .split(RegExp(r'\r?\n'))
          .where((String line) => line.trim().isNotEmpty)
          .toList();
      if (lines.length <= 1) {
        if (!mounted) {
          return;
        }
        showAppToast(context, '暂无数据可导出');
        return;
      }
      final String filename =
          'miaochat_export_${formatDate(DateTime.now())}.csv';
      await Share.shareXFiles(
        <XFile>[
          XFile.fromData(
            utf8.encode(csv),
            mimeType: 'text/csv',
            name: filename,
          ),
        ],
        subject: filename,
      );
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      showAppToast(context, error.message);
    } catch (_) {
      if (!mounted) {
        return;
      }
      showAppToast(context, '网络连接较慢，请重试');
    } finally {
      if (mounted) {
        setState(() {
          _exporting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final AsyncValue<User> async = ref.watch(userProvider);
    ref.listen<AsyncValue<User>>(userProvider, (
      AsyncValue<User>? previous,
      AsyncValue<User> next,
    ) {
      next.whenOrNull(
        error: (Object error, StackTrace stack) {
          final String message =
              error is ApiException ? error.message : '网络连接较慢，请重试';
          showAppToast(context, message);
        },
      );
    });
    return Scaffold(
      appBar: AppBar(
        title: const Text('我的'),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (Object error, StackTrace stack) {
          final String message =
              error is ApiException ? error.message : '网络连接较慢，请重试';
          return Center(child: Text(message, style: AppTextStyles.body));
        },
        data: (User user) {
          final AsyncValue<AssetOverview> assets = ref.watch(assetOverviewProvider);
          return ListView(
            padding: const EdgeInsets.all(AppDimens.spacingMd),
            children: <Widget>[
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(AppDimens.spacingMd),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(user.phone, style: AppTextStyles.title),
                      const SizedBox(height: AppDimens.spacingSm),
                      Text(
                        '注册时间 ${formatDate(user.createdAt.toLocal())}',
                        style: AppTextStyles.caption,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppDimens.spacingLg),
              const Text('资产总览', style: AppTextStyles.title),
              const SizedBox(height: AppDimens.spacingSm),
              assets.when(
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(vertical: AppDimens.spacingMd),
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (Object error, StackTrace stack) {
                  final String message =
                      error is ApiException ? error.message : '网络连接较慢，请重试';
                  return Text(message, style: AppTextStyles.caption);
                },
                data: (AssetOverview overview) {
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(AppDimens.spacingMd),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            '总资产 ¥${overview.totalAssetsYuan}',
                            style: AppTextStyles.title,
                          ),
                          const SizedBox(height: AppDimens.spacingSm),
                          Text(
                            '存款 ${formatYuanFromFen(overview.summary['deposit'] ?? 0)} · '
                            '信用卡 ${formatYuanFromFen(overview.summary['credit'] ?? 0)} · '
                            '基金 ${formatYuanFromFen(overview.summary['fund'] ?? 0)}',
                            style: AppTextStyles.caption,
                          ),
                          Text(
                            '股票 ${formatYuanFromFen(overview.summary['stock'] ?? 0)} · '
                            '其他 ${formatYuanFromFen(overview.summary['other'] ?? 0)}',
                            style: AppTextStyles.caption,
                          ),
                          const SizedBox(height: AppDimens.spacingMd),
                          if (overview.accounts.isEmpty)
                            const Text('暂无资产账户', style: AppTextStyles.caption)
                          else
                            ...overview.accounts.map((AssetAccount account) {
                              return ListTile(
                                contentPadding: EdgeInsets.zero,
                                leading: Text(account.icon),
                                title: Text(account.name),
                                subtitle: Text(assetTypeLabel(account.type)),
                                trailing: Text('¥${account.balanceYuan}'),
                                onTap: () {
                                  Navigator.pushNamed(
                                    context,
                                    AppRouter.assetDetail,
                                    arguments: AssetDetailArgs(
                                      accountId: account.id,
                                      title: account.name,
                                    ),
                                  );
                                },
                              );
                            }),
                        ],
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: AppDimens.spacingLg),
              const Text('记账人格', style: AppTextStyles.title),
              const SizedBox(height: AppDimens.spacingSm),
              PersonalitySelector(
                selected: user.personality,
                onSelected: _changePersonality,
              ),
              const SizedBox(height: AppDimens.spacingLg),
              ListTile(
                leading: const Icon(Icons.download),
                title: const Text('导出数据'),
                subtitle: const Text('下载全部交易 CSV'),
                trailing: _exporting
                    ? const SizedBox(
                        width: AppDimens.spacingLg,
                        height: AppDimens.spacingLg,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.chevron_right),
                onTap: _exporting ? null : _export,
              ),
            ],
          );
        },
      ),
      bottomNavigationBar: const BottomNavBar(currentIndex: 2),
    );
  }
}
