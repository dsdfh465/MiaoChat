/// 用户状态：MVP 阶段硬编码 userId，后续接入登录。
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/api_config.dart';
import '../models/user.model.dart';
import '../services/api.service.dart';

/// 当前用户 ID
final userIdProvider = Provider<String>((Ref ref) {
  return ApiConfig.mvpUserId;
});

/// 当前用户信息
final userProvider = FutureProvider<User>((Ref ref) async {
  final String userId = ref.read(userIdProvider);
  final ApiService api = ref.read(apiServiceProvider);
  return api.getUserInfo(userId);
});
