/// 语音识别引擎占位实现（Web 等不支持 Vosk 的平台）。
library;

import 'dart:async';

/// 平台语音引擎
class VoiceEngine {
  /// 是否支持麦克风识别
  bool get isSupported => false;

  /// 识别文本流
  Stream<String> get transcripts => const Stream<String>.empty();

  /// 加载模型
  Future<void> loadModel() async {}

  /// 开始听
  Future<void> start() async {
    throw UnsupportedError('当前平台不支持语音识别');
  }

  /// 停止听并返回最终文本
  Future<String> stop() async => '';

  /// 释放资源
  Future<void> dispose() async {}
}
