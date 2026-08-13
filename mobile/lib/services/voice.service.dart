/// Vosk 语音识别封装：startListening / stopListening，结果经 Stream 输出。
library;

import 'voice_impl_stub.dart'
    if (dart.library.io) 'voice_impl_io.dart' as impl;

/// 语音识别服务
class VoiceService {
  VoiceService() : _engine = impl.VoiceEngine();

  final impl.VoiceEngine _engine;
  bool _loading = false;

  /// 当前平台是否可用
  bool get isSupported => _engine.isSupported;

  /// 模型是否正在下载/加载
  bool get isLoading => _loading;

  /// 识别文本流（含中间结果）
  Stream<String> get transcripts => _engine.transcripts;

  /// 首次使用时下载词库；失败时抛出可读错误
  Future<void> ensureReady() async {
    if (!_engine.isSupported) {
      return;
    }
    _loading = true;
    try {
      await _engine.loadModel();
    } catch (_) {
      throw Exception('语音识别模型加载失败，请检查网络后重试');
    } finally {
      _loading = false;
    }
  }

  /// 开始录音识别
  Future<void> startListening() async {
    await ensureReady();
    if (!_engine.isSupported) {
      throw Exception('当前设备暂不支持语音识别，请使用文字输入');
    }
    await _engine.start();
  }

  /// 停止录音，返回最终识别文本
  Future<String> stopListening() {
    return _engine.stop();
  }

  /// 释放引擎
  Future<void> dispose() => _engine.dispose();
}
