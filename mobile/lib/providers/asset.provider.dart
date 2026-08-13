/// 资产账户状态 Provider。
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/asset.model.dart';
import '../services/api.service.dart';
import 'auth.provider.dart';

/// 资产总览
final assetOverviewProvider = FutureProvider<AssetOverview>((Ref ref) async {
  final String userId = ref.read(userIdProvider);
  final ApiService api = ref.read(apiServiceProvider);
  return api.getAssetOverview(userId);
});
