/// 底部三 Tab 导航：妙语 / 目标 / 我的。
library;

import 'package:flutter/material.dart';

import '../config/theme.dart';
import '../routes/app_router.dart';

/// 应用底部导航栏
class BottomNavBar extends StatelessWidget {
  const BottomNavBar({
    super.key,
    required this.currentIndex,
  });

  /// 当前选中的 Tab 下标：0 妙语 / 1 目标 / 2 我的
  final int currentIndex;

  static const List<String> _routes = <String>[
    AppRouter.home,
    AppRouter.target,
    AppRouter.profile,
  ];

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      currentIndex: currentIndex,
      selectedItemColor: AppColors.primary,
      unselectedItemColor: AppColors.unselected,
      onTap: (int index) {
        _onTabTapped(context, index);
      },
      items: const <BottomNavigationBarItem>[
        BottomNavigationBarItem(
          icon: Icon(Icons.chat_bubble_outline),
          activeIcon: Icon(Icons.chat_bubble),
          label: '妙语',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.flag_outlined),
          activeIcon: Icon(Icons.flag),
          label: '目标',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.person_outline),
          activeIcon: Icon(Icons.person),
          label: '我的',
        ),
      ],
    );
  }

  /// 点击 Tab 后按命名路由跳转
  void _onTabTapped(BuildContext context, int index) {
    if (!context.mounted) {
      return;
    }
    Navigator.pushNamed(context, _routes[index]);
  }
}
