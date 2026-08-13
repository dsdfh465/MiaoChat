/// 应用主题色、间距与文字样式常量，禁止在业务 Widget 中硬编码。
library;

import 'package:flutter/material.dart';

/// 品牌色、气泡色与预算状态色
class AppColors {
  AppColors._();

  /// 主题色（Material deepPurple）
  static const Color primary = Colors.deepPurple;

  /// 底部导航未选中色
  static const Color unselected = Colors.grey;

  /// 用户语音气泡
  static const Color userBubble = Color(0xFF5C6BC0);

  /// 系统气泡背景
  static const Color systemBubble = Color(0xFFEEEEEE);

  /// 用户气泡文字
  static const Color userBubbleText = Colors.white;

  /// 确认卡片渐变起色
  static const Color confirmGradientStart = Color(0xFF7E57C2);

  /// 确认卡片渐变止色
  static const Color confirmGradientEnd = Color(0xFF5C6BC0);

  /// 预算正常
  static const Color budgetNormal = Color(0xFF2E7D32);

  /// 预算预警
  static const Color budgetWarning = Color(0xFFEF6C00);

  /// 预算危险
  static const Color budgetDanger = Color(0xFFD32F2F);

  /// 预算超支
  static const Color budgetExceeded = Color(0xFF8B0000);

  /// 进度环轨道
  static const Color ringTrack = Color(0xFFE0E0E0);
}

/// 间距、圆角与图标尺寸
class AppDimens {
  AppDimens._();

  static const double spacingXs = 4;
  static const double spacingSm = 8;
  static const double spacingMd = 16;
  static const double spacingLg = 24;
  static const double spacingXl = 32;
  static const double micIconSize = 72;
  static const double recordButtonSize = 80;
  static const double radiusMd = 12;
  static const double radiusLg = 20;
  static const double bubbleMaxWidthFactor = 0.8;
  static const double progressRingSize = 180;
  static const double progressRingStroke = 14;
  static const double swipeThreshold = 80;
  static const double categoryBarHeight = 8;
}

/// 文字样式
class AppTextStyles {
  AppTextStyles._();

  static const TextStyle body = TextStyle(fontSize: 16);
  static const TextStyle caption = TextStyle(fontSize: 14);
  static const TextStyle title = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w600,
  );
  static const TextStyle ringPercent = TextStyle(
    fontSize: 32,
    fontWeight: FontWeight.bold,
  );
}

/// 应用 ThemeData
class AppTheme {
  AppTheme._();

  /// 浅色主题，种子色为品牌紫
  static ThemeData get light {
    return ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: AppColors.primary),
      useMaterial3: true,
    );
  }
}

/// 根据预算状态返回进度条颜色
///
/// [status] 为 normal / warning / danger / exceeded
Color budgetStatusColor(String status) {
  switch (status) {
    case 'warning':
      return AppColors.budgetWarning;
    case 'danger':
      return AppColors.budgetDanger;
    case 'exceeded':
      return AppColors.budgetExceeded;
    default:
      return AppColors.budgetNormal;
  }
}
