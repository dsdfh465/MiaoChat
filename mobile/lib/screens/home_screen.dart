/// 首页：语音/文字记账、确认卡片与今日支出。
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/theme.dart';
import '../models/asset.model.dart';
import '../models/category.model.dart';
import '../models/transaction.model.dart';
import '../providers/asset.provider.dart';
import '../providers/auth.provider.dart';
import '../providers/transaction.provider.dart';
import '../services/api.service.dart';
import '../services/parser.service.dart';
import '../services/voice.service.dart';
import '../utils/formatters.dart';
import '../utils/toast.dart';
import '../widgets/bottom_nav_bar.dart';
import '../widgets/confirm_card.dart';

class _ChatEntry {
  _ChatEntry.user(this.text)
      : draft = null,
        confirmed = false;

  _ChatEntry.card(this.draft)
      : text = null,
        confirmed = false;

  final String? text;
  ParsedTransaction? draft;
  bool confirmed;
}

/// 妙语记账首页
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen>
    with SingleTickerProviderStateMixin {
  final VoiceService _voice = VoiceService();
  final TextEditingController _textController = TextEditingController();
  final List<_ChatEntry> _chats = <_ChatEntry>[];
  final ScrollController _scrollController = ScrollController();

  StreamSubscription<String>? _voiceSub;
  late final AnimationController _pulse;
  bool _listening = false;
  bool _loadingModel = false;
  int? _liveUserIndex;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _voiceSub = _voice.transcripts.listen(_onPartialText);
  }

  @override
  void dispose() {
    _voiceSub?.cancel();
    unawaited(_voice.dispose());
    _textController.dispose();
    _scrollController.dispose();
    _pulse.dispose();
    super.dispose();
  }

  void _onPartialText(String text) {
    if (!mounted || text.isEmpty) {
      return;
    }
    setState(() {
      if (_liveUserIndex != null && _liveUserIndex! < _chats.length) {
        _chats[_liveUserIndex!] = _ChatEntry.user(text);
      } else {
        _chats.add(_ChatEntry.user(text));
        _liveUserIndex = _chats.length - 1;
      }
    });
    _scrollToEnd();
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) {
        return;
      }
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _startListen() async {
    setState(() {
      _loadingModel = true;
    });
    try {
      await _voice.startListening();
      if (!mounted) {
        return;
      }
      setState(() {
        _loadingModel = false;
        _listening = true;
        _chats.add(_ChatEntry.user('正在听...'));
        _liveUserIndex = _chats.length - 1;
      });
      unawaited(_pulse.repeat(reverse: true));
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loadingModel = false;
        _listening = false;
      });
      final String raw = error.toString();
      final String message;
      if (raw.contains('模型')) {
        message = '语音识别模型加载失败，请检查网络后重试';
      } else if (raw.contains('不支持')) {
        message = '当前设备暂不支持语音识别，请使用文字输入';
      } else if (raw.contains('麦克风')) {
        message = '需要麦克风权限才能语音记账';
      } else {
        message = '没听清，再试一次';
      }
      showAppToast(context, message);
    }
  }

  Future<void> _stopListen() async {
    if (!_listening) {
      return;
    }
    _pulse.stop();
    _pulse.reset();
    String text = '';
    try {
      text = await _voice.stopListening();
    } catch (_) {
      text = '';
    }
    if (!mounted) {
      return;
    }
    setState(() {
      _listening = false;
      _liveUserIndex = null;
    });
    if (text.trim().isEmpty) {
      showAppToast(context, '没听清，再试一次');
      return;
    }
    _applyParsed(text);
  }

  void _submitText() {
    final String text = _textController.text.trim();
    if (text.isEmpty) {
      return;
    }
    _textController.clear();
    setState(() {
      _chats.add(_ChatEntry.user(text));
    });
    _applyParsed(text);
  }

  void _applyParsed(String text) {
    unawaited(_applyParsedAsync(text));
  }

  Future<void> _applyParsedAsync(String text) async {
    final ParserService parser = ref.read(parserServiceProvider);
    List<String> accountNames = <String>[];
    List<AssetAccount> accounts = <AssetAccount>[];
    try {
      final AssetOverview overview = await ref.read(assetOverviewProvider.future);
      accounts = overview.accounts;
      accountNames = accounts.map((AssetAccount item) => item.name).toList();
    } catch (_) {
      // 资产接口不可用时退回日常记账
    }

    final ParsedAssetIntent? assetIntent = parser.parseAssetIntent(
      text,
      accountNames: accountNames,
    );
      if (assetIntent != null) {
      AssetAccount? matched;
      for (final AssetAccount account in accounts) {
        final bool nameHit = account.name.contains(assetIntent.accountHint) ||
            assetIntent.accountHint.contains(account.name);
        final bool codeHit = assetIntent.stockCodeHint != null &&
            account.stockCode == assetIntent.stockCodeHint;
        if (nameHit || codeHit) {
          matched = account;
          break;
        }
      }
      if (matched != null && assetIntent.amount > 0) {
        try {
          final String userId = ref.read(userIdProvider);
          await ref.read(apiServiceProvider).recordAssetTransaction(
                userId,
                matched.id,
                amount: assetIntent.amount,
                type: assetIntent.transactionType,
                category: assetIntent.category,
                note: assetIntent.note,
                shares: assetIntent.shares,
              );
          ref.invalidate(assetOverviewProvider);
          if (!mounted) {
            return;
          }
          setState(() {
            _chats.add(
              _ChatEntry.user(
                '已记入 ${matched!.name}：${assetIntent.transactionType} ¥${formatYuanFromFen(assetIntent.amount)}',
              ),
            );
          });
          _scrollToEnd();
          showAppToast(context, '资产账户已更新');
          return;
        } on ApiException catch (error) {
          if (mounted) {
            showAppToast(context, error.message);
          }
          return;
        } catch (_) {
          if (mounted) {
            showAppToast(context, '网络连接较慢，请重试');
          }
          return;
        }
      }
      if (assetIntent.amount <= 0 && assetIntent.shares != null) {
        // 仅股数场景仍提示未能识别金额以外的信息
      }
    }

    final ParsedTransaction? parsed = parser.parse(text);
    if (parsed == null) {
      if (mounted) {
        showAppToast(context, '未能识别金额，请重新说');
      }
      return;
    }
    if (!mounted) {
      return;
    }
    setState(() {
      _chats.add(_ChatEntry.card(parsed));
    });
    _scrollToEnd();
  }

  Future<void> _confirm(_ChatEntry entry) async {
    final ParsedTransaction? draft = entry.draft;
    if (draft == null) {
      return;
    }
    try {
      await createTransaction(
        ref,
        CreateTransactionParams(
          amount: draft.amount,
          categoryName: draft.categoryName,
          note: draft.note,
        ),
      );
      if (!mounted) {
        return;
      }
      setState(() {
        entry.confirmed = true;
      });
      showAppToast(context, '已入账');
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      showAppToast(context, error.message);
    } catch (_) {
      if (!mounted) {
        return;
      }
      showAppToast(context, '网络连接较慢，请重试');
    }
  }

  Future<void> _pickCategory(_ChatEntry entry) async {
    final String? name = await showModalBottomSheet<String>(
      context: context,
      builder: (BuildContext context) {
        return SafeArea(
          child: ListView(
            shrinkWrap: true,
            children: kSystemCategories.map((CategoryOption option) {
              return ListTile(
                title: Text('${option.icon}  ${option.name}'),
                onTap: () => Navigator.pop(context, option.name),
              );
            }).toList(),
          ),
        );
      },
    );
    if (!mounted || name == null || entry.draft == null) {
      return;
    }
    setState(() {
      entry.draft = entry.draft!.copyWith(categoryName: name);
    });
  }

  @override
  Widget build(BuildContext context) {
    final AsyncValue<int> today = ref.watch(todayExpenseProvider);
    ref.listen<AsyncValue<int>>(todayExpenseProvider, (
      AsyncValue<int>? previous,
      AsyncValue<int> next,
    ) {
      next.whenOrNull(
        error: (Object error, StackTrace stack) {
          final String message =
              error is ApiException ? error.message : '网络连接较慢，请重试';
          showAppToast(context, message);
        },
      );
    });
    return Scaffold(
      appBar: AppBar(
        title: const Text('妙语记账'),
      ),
      body: Column(
        children: <Widget>[
          _TodayBanner(today: today),
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(AppDimens.spacingMd),
              itemCount: _chats.length,
              itemBuilder: (BuildContext context, int index) {
                return _ChatBubble(
                  entry: _chats[index],
                  onConfirm: () => _confirm(_chats[index]),
                  onEditCategory: () => _pickCategory(_chats[index]),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppDimens.spacingMd),
            child: TextField(
              controller: _textController,
              decoration: const InputDecoration(
                hintText: '没听清时也可手动输入，如：中午吃面花了25',
                border: OutlineInputBorder(),
              ),
              onSubmitted: (_) => _submitText(),
            ),
          ),
          const SizedBox(height: AppDimens.spacingSm),
          _RecordButton(
            listening: _listening,
            loading: _loadingModel,
            pulse: _pulse,
            onLongPressStart: (_) => _startListen(),
            onLongPressEnd: (_) => _stopListen(),
          ),
          const SizedBox(height: AppDimens.spacingMd),
        ],
      ),
      bottomNavigationBar: const BottomNavBar(currentIndex: 0),
    );
  }
}

class _TodayBanner extends StatelessWidget {
  const _TodayBanner({required this.today});

  final AsyncValue<int> today;

  @override
  Widget build(BuildContext context) {
    final String amount = today.when(
      data: (int fen) => formatYuanFromFen(fen),
      loading: () => '--',
      error: (Object _, StackTrace __) => '--',
    );
    return Container(
      width: double.infinity,
      color: AppColors.systemBubble,
      padding: const EdgeInsets.all(AppDimens.spacingMd),
      child: Text(
        '今日支出 $amount 元',
        style: AppTextStyles.title,
        textAlign: TextAlign.center,
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({
    required this.entry,
    required this.onConfirm,
    required this.onEditCategory,
  });

  final _ChatEntry entry;
  final VoidCallback onConfirm;
  final VoidCallback onEditCategory;

  @override
  Widget build(BuildContext context) {
    if (entry.draft != null) {
      return Align(
        alignment: Alignment.centerLeft,
        child: Padding(
          padding: const EdgeInsets.only(bottom: AppDimens.spacingMd),
          child: ConfirmCard(
            draft: entry.draft!,
            confirmed: entry.confirmed,
            onConfirm: onConfirm,
            onEditCategory: onEditCategory,
          ),
        ),
      );
    }
    return Align(
      alignment: Alignment.centerRight,
      child: Container(
        constraints: BoxConstraints(
          maxWidth:
              MediaQuery.sizeOf(context).width * AppDimens.bubbleMaxWidthFactor,
        ),
        margin: const EdgeInsets.only(bottom: AppDimens.spacingMd),
        padding: const EdgeInsets.all(AppDimens.spacingMd),
        decoration: BoxDecoration(
          color: AppColors.userBubble,
          borderRadius: BorderRadius.circular(AppDimens.radiusLg),
        ),
        child: Text(
          entry.text ?? '',
          style: AppTextStyles.body.copyWith(color: AppColors.userBubbleText),
        ),
      ),
    );
  }
}

class _RecordButton extends StatelessWidget {
  const _RecordButton({
    required this.listening,
    required this.loading,
    required this.pulse,
    required this.onLongPressStart,
    required this.onLongPressEnd,
  });

  final bool listening;
  final bool loading;
  final Animation<double> pulse;
  final GestureLongPressStartCallback onLongPressStart;
  final GestureLongPressEndCallback onLongPressEnd;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
        GestureDetector(
          onLongPressStart: onLongPressStart,
          onLongPressEnd: onLongPressEnd,
          child: ScaleTransition(
            scale: Tween<double>(begin: 1, end: 1.12).animate(pulse),
            child: Container(
              width: AppDimens.recordButtonSize,
              height: AppDimens.recordButtonSize,
              decoration: const BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
              ),
              child: Icon(
                loading ? Icons.hourglass_top : Icons.mic,
                color: AppColors.userBubbleText,
                size: AppDimens.micIconSize / 2,
              ),
            ),
          ),
        ),
        const SizedBox(height: AppDimens.spacingSm),
        Text(
          listening
              ? '正在听...'
              : (loading ? '正在加载语音模型...' : '按住说话，即刻记账 / 说句话的事儿 ✨'),
          style: AppTextStyles.caption,
        ),
      ],
    );
  }
}
