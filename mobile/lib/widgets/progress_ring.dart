/// 月度总进度环，CustomPaint 绘制，入场动画 0.8 秒。
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../config/theme.dart';

/// 圆形进度环
class ProgressRing extends StatefulWidget {
  const ProgressRing({
    super.key,
    required this.percentage,
    required this.spentLabel,
    required this.goalLabel,
    required this.status,
  });

  /// 0-100+ 的进度
  final double percentage;
  final String spentLabel;
  final String goalLabel;
  final String status;

  @override
  State<ProgressRing> createState() => _ProgressRingState();
}

class _ProgressRingState extends State<ProgressRing>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _animation = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _controller.forward();
  }

  @override
  void didUpdateWidget(covariant ProgressRing oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.percentage != widget.percentage) {
      _controller.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (BuildContext context, Widget? child) {
        final double shown = widget.percentage * _animation.value;
        return SizedBox(
          width: AppDimens.progressRingSize,
          height: AppDimens.progressRingSize,
          child: CustomPaint(
            painter: _RingPainter(
              progress: (shown / 100).clamp(0, 1),
              color: budgetStatusColor(widget.status),
            ),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  Text(
                    '${shown.toStringAsFixed(1)}%',
                    style: AppTextStyles.ringPercent,
                  ),
                  const SizedBox(height: AppDimens.spacingXs),
                  Text(
                    '${widget.spentLabel} / ${widget.goalLabel}',
                    style: AppTextStyles.caption,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({
    required this.progress,
    required this.color,
  });

  final double progress;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final Offset center = Offset(size.width / 2, size.height / 2);
    final double radius =
        (math.min(size.width, size.height) - AppDimens.progressRingStroke) / 2;
    final Paint track = Paint()
      ..color = AppColors.ringTrack
      ..style = PaintingStyle.stroke
      ..strokeWidth = AppDimens.progressRingStroke
      ..strokeCap = StrokeCap.round;
    final Paint arc = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = AppDimens.progressRingStroke
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(center, radius, track);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      2 * math.pi * progress,
      false,
      arc,
    );
  }

  @override
  bool shouldRepaint(covariant _RingPainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.color != color;
  }
}
