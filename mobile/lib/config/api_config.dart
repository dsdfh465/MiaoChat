/// API 基础地址：Android 模拟器用 10.0.2.2，其余用本机回环。
library;

import 'package:flutter/foundation.dart';

/// 后端 API 配置
class ApiConfig {
  ApiConfig._();

  /// 请求超时
  static const Duration timeout = Duration(seconds: 10);

  /// MVP 测试用户 ID，后续接入登录后移除硬编码
  static const String mvpUserId = 'c036458e-167d-4f51-9f3b-7cb2430a536f';

  /// 按运行平台选择可访问后端的基础 URL
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:3000/api/v1';
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'http://10.0.2.2:3000/api/v1';
      default:
        return 'http://127.0.0.1:3000/api/v1';
    }
  }
}
