/// 人格选择器：严师 / 闺蜜 / 佛系。
library;

import 'package:flutter/material.dart';

import '../config/theme.dart';
import '../models/user.model.dart';

/// 三选一人格标签
class PersonalitySelector extends StatelessWidget {
  const PersonalitySelector({
    super.key,
    required this.selected,
    required this.onSelected,
  });

  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: kPersonalityOptions.map((PersonalityOption option) {
        final bool active = option.value == selected;
        return Padding(
          padding: const EdgeInsets.only(bottom: AppDimens.spacingSm),
          child: ListTile(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppDimens.radiusMd),
              side: BorderSide(
                color: active ? AppColors.primary : AppColors.ringTrack,
              ),
            ),
            selected: active,
            selectedTileColor: AppColors.primary.withValues(alpha: 0.08),
            title: Text(option.label, style: AppTextStyles.body),
            subtitle: Text(option.description, style: AppTextStyles.caption),
            trailing: active
                ? const Icon(Icons.check_circle, color: AppColors.primary)
                : const Icon(Icons.circle_outlined),
            onTap: () => onSelected(option.value),
          ),
        );
      }).toList(),
    );
  }
}
