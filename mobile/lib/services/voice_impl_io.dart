/// Android / 桌面端 Vosk 语音识别实现：首次使用下载中文小模型。
library;

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:permission_handler/permission_handler.dart';
import 'package:vosk_flutter/vosk_flutter.dart';

const String _cnModelUrl =
    'https://alphacephei.com/vosk/models/vosk-model-small-cn-0.22.zip';

/// 平台语音引擎
class VoiceEngine {
  final StreamController<String> _controller =
      StreamController<String>.broadcast();
  final ModelLoader _loader = ModelLoader();

  SpeechService? _speech;
  StreamSubscription<String>? _partialSub;
  StreamSubscription<String>? _resultSub;
  String _latest = '';
  bool _loaded = false;

  /// 是否支持麦克风识别（Android；其余走 FFI 时再尝试）
  bool get isSupported => Platform.isAndroid;

  /// 识别文本流
  Stream<String> get transcripts => _controller.stream;

  /// 下载模型，失败最多重试 2 次
  Future<String> _loadModelWithRetry() async {
    Object? lastError;
    for (int attempt = 0; attempt < 3; attempt++) {
      try {
        return await _loader.loadFromNetwork(_cnModelUrl);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? Exception('语音识别模型加载失败，请检查网络后重试');
  }

  /// 下载并加载中文模型
  Future<void> loadModel() async {
    if (_loaded) {
      return;
    }
    final PermissionStatus status = await Permission.microphone.request();
    if (!status.isGranted) {
      throw Exception('需要麦克风权限才能语音记账');
    }

    final String modelPath = await _loadModelWithRetry();
    final VoskFlutterPlugin vosk = VoskFlutterPlugin.instance();
    final Model model = await vosk.createModel(modelPath);
    final Recognizer recognizer = await vosk.createRecognizer(
      model: model,
      sampleRate: 16000,
    );
    _speech = await vosk.initSpeechService(recognizer);
    _partialSub = _speech!.onPartial().listen(_onRaw);
    _resultSub = _speech!.onResult().listen(_onRaw);
    _loaded = true;
  }

  /// 开始听
  Future<void> start() async {
    await loadModel();
    _latest = '';
    await _speech?.reset();
    await _speech?.start();
  }

  /// 停止听并返回最终文本
  Future<String> stop() async {
    await _speech?.stop();
    return _latest;
  }

  /// 释放资源
  Future<void> dispose() async {
    await _partialSub?.cancel();
    await _resultSub?.cancel();
    await _speech?.dispose();
    await _controller.close();
  }

  void _onRaw(String raw) {
    final String text = _extractText(raw);
    if (text.isEmpty) {
      return;
    }
    _latest = text;
    if (!_controller.isClosed) {
      _controller.add(text);
    }
  }

  String _extractText(String raw) {
    try {
      final dynamic decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) {
        final Object? text = decoded['text'] ?? decoded['partial'];
        if (text is String) {
          return text.trim();
        }
      }
    } catch (_) {
      return raw.trim();
    }
    return raw.trim();
  }
}
