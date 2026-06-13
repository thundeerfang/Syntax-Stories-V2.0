import 'package:flutter/material.dart';

import '../../theme/app_color_tokens.dart';

/// Square add control with primary background — skills row, promotion header, etc.
class ProfilePrimaryAddButton extends StatelessWidget {
  const ProfilePrimaryAddButton({
    super.key,
    required this.onPressed,
    this.enabled = true,
    this.size = 48,
  });

  final VoidCallback? onPressed;
  final bool enabled;
  final double size;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final active = enabled && onPressed != null;

    return Material(
      color: active ? colors.primary : colors.muted.withValues(alpha: 0.35),
      child: InkWell(
        onTap: active ? onPressed : null,
        child: SizedBox(
          width: size,
          height: size,
          child: Icon(
            Icons.add_rounded,
            size: 22,
            color: active ? colors.primaryForeground : colors.mutedForeground,
          ),
        ),
      ),
    );
  }
}
