/// 应用命名路由表，将路径映射到对应页面。
library;

import 'package:flutter/material.dart';

import '../screens/home_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/target_screen.dart';

/// 静态路由常量与 onGenerateRoute 实现
class AppRouter {
  AppRouter._();

  static const String home = '/';
  static const String target = '/target';
  static const String profile = '/profile';

  /// 根据 [settings.name] 返回对应 [MaterialPageRoute]
  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case home:
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (BuildContext context) => const HomeScreen(),
        );
      case target:
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (BuildContext context) => const TargetScreen(),
        );
      case profile:
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (BuildContext context) => const ProfileScreen(),
        );
      default:
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (BuildContext context) => const HomeScreen(),
        );
    }
  }
}
