/// 滑动确认卡片：右滑入账，左滑改分类。
library;

import 'package:flutter/material.dart';

import '../config/theme.dart';
import '../models/transaction.model.dart';
import '../utils/formatters.dart';

/// 语音记账确认卡片
class ConfirmCard extends StatefulWidget {
  const ConfirmCard({
    super.key,
    required this.draft,
    required this.confirmed,
    required this.onConfirm,
    required this.onEditCategory,
  });

  final ParsedTransaction draft;
  final bool confirmed;
  final VoidCallback onConfirm;
  final VoidCallback onEditCategory;

  @override
  State<ConfirmCard> createState() => _ConfirmCardState();
}

class _ConfirmCardState extends State<ConfirmCard> {
  double _dx = 0;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onHorizontalDragUpdate: widget.confirmed
          ? null
          : (DragUpdateDetails details) {
              setState(() {
                _dx += details.delta.dx;
              });
            },
      onHorizontalDragEnd: widget.confirmed
          ? null
          : (DragEndDetails details) {
              if (_dx > AppDimens.swipeThreshold) {
                widget.onConfirm();
              } else if (_dx < -AppDimens.swipeThreshold) {
                widget.onEditCategory();
              }
              setState(() {
                _dx = 0;
              });
            },
      child: Transform.translate(
        offset: Offset(_dx.clamp(-120, 120), 0),
        child: Container(
          constraints: BoxConstraints(
            maxWidth:
                MediaQuery.sizeOf(context).width * AppDimens.bubbleMaxWidthFactor,
          ),
          padding: const EdgeInsets.all(AppDimens.spacingMd),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: <Color>[
                AppColors.confirmGradientStart,
                AppColors.confirmGradientEnd,
              ],
            ),
            borderRadius: BorderRadius.circular(AppDimens.radiusMd),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                widget.confirmed ? '已入账' : '滑动确认记账',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.userBubbleText,
                ),
              ),
              const SizedBox(height: AppDimens.spacingSm),
              Text(
                '¥${formatYuanFromFen(widget.draft.amount)}',
                style: AppTextStyles.title.copyWith(
                  color: AppColors.userBubbleText,
                ),
              ),
              const SizedBox(height: AppDimens.spacingXs),
              Text(
                '${widget.draft.categoryName}  ·  ${widget.draft.note}',
                style: AppTextStyles.body.copyWith(
                  color: AppColors.userBubbleText,
                ),
              ),
              if (!widget.confirmed) ...<Widget>[
                const SizedBox(height: AppDimens.spacingSm),
                Text(
                  '右滑确认 · 左滑改分类',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.userBubbleText,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
