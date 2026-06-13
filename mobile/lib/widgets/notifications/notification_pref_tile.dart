import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import '../../utils/notification_pref_config.dart';

class NotificationPrefTile extends StatelessWidget {
  const NotificationPrefTile({
    super.key,
    required this.item,
    required this.value,
    required this.onChanged,
    this.disabled = false,
    this.saving = false,
  });

  final NotificationPrefItem item;
  final bool value;
  final ValueChanged<bool> onChanged;
  final bool disabled;
  final bool saving;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final active = value;
    final borderColor = colors.border.withValues(alpha: 0.85);

    return Opacity(
      opacity: disabled ? 0.5 : 1,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: active ? colors.primary.withValues(alpha: 0.06) : colors.card,
          border: Border.all(color: borderColor, width: 2),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: active ? colors.primary : colors.muted.withValues(alpha: 0.25),
                border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 2),
              ),
              child: Icon(
                item.icon,
                size: 18,
                color: active ? colors.primaryForeground : colors.mutedForeground,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.label.toUpperCase(),
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.6,
                      color: colors.foreground,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.hint,
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      height: 1.35,
                      color: colors.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            if (saving)
              SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2, color: colors.primary),
              )
            else
              SizedBox(
                height: 24,
                child: Align(
                  alignment: Alignment.center,
                  child: Transform.scale(
                    scale: 0.68,
                    alignment: Alignment.center,
                    child: Switch.adaptive(
                      value: value,
                      onChanged: disabled ? null : onChanged,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      activeThumbColor: colors.primaryForeground,
                      activeTrackColor: colors.primary,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
