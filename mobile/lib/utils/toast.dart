/// 统一 Toast（SnackBar），异步回调前需保证 context 仍 mounted。
library;

import 'package:flutter/material.dart';

/// 展示短提示
///
/// [context] 当前 BuildContext
/// [message] 提示文案
void showAppToast(BuildContext context, String message) {
  if (!context.mounted) {
    return;
  }
  ScaffoldMessenger.of(context).hideCurrentSnackBar();
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(message)),
  );
}
