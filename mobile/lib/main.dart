/// 妙语记账应用入口，使用 Riverpod 包裹根组件并配置主题与路由。
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'config/theme.dart';
import 'routes/app_router.dart';

void main() {
  runApp(const ProviderScope(child: MyApp()));
}

/// 应用根组件
class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '妙语记账',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      onGenerateRoute: AppRouter.onGenerateRoute,
      initialRoute: AppRouter.home,
    );
  }
}
