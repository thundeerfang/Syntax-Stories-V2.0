import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/app_feedback.dart';
import '../../theme/app_color_tokens.dart';

/// Inline page feedback — used for composer/field-scoped messages. For transient
/// action feedback app-wide, prefer [AppFeedbackToast].
class AppFeedbackBanner extends StatelessWidget {
  const AppFeedbackBanner({
    super.key,
    required this.message,
    required this.kind,
    this.onDismiss,
  });

  final String message;
  final AppFeedbackKind kind;
  final VoidCallback? onDismiss;

  @override
  Widget build(BuildContext context) {
    final colors = _colorsFor(context, kind);
    return Material(
      color: colors.background,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          border: Border.all(color: colors.border, width: 2),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(colors.icon, size: 18, color: colors.foreground),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    message,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      height: 1.35,
                      color: colors.foreground,
                    ),
                  ),
                ],
              ),
            ),
            if (onDismiss != null)
              GestureDetector(
                onTap: onDismiss,
                child: Icon(Icons.close, size: 16, color: colors.foreground.withValues(alpha: 0.7)),
              ),
          ],
        ),
      ),
    );
  }

  static _FeedbackColors _colorsFor(BuildContext context, AppFeedbackKind kind) {
    final c = context.appColors;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return switch (kind) {
      AppFeedbackKind.error => _FeedbackColors(
          background: isDark ? c.destructive.withValues(alpha: 0.14) : const Color(0xFFFEF2F2),
          border: c.destructive,
          foreground: isDark ? const Color(0xFFFCA5A5) : const Color(0xFFB91C1C),
          icon: Icons.error_outline,
        ),
      AppFeedbackKind.warning => _FeedbackColors(
          background: isDark ? c.accent.withValues(alpha: 0.12) : const Color(0xFFFFFBEB),
          border: c.accent,
          foreground: isDark ? c.accent : const Color(0xFFB45309),
          icon: Icons.warning_amber_outlined,
        ),
      AppFeedbackKind.success => _FeedbackColors(
          background: isDark ? c.success.withValues(alpha: 0.14) : const Color(0xFFECFDF5),
          border: c.success,
          foreground: isDark ? c.success : const Color(0xFF047857),
          icon: Icons.check_circle_outline,
        ),
    };
  }
}

class _FeedbackColors {
  const _FeedbackColors({
    required this.background,
    required this.border,
    required this.foreground,
    required this.icon,
  });

  final Color background;
  final Color border;
  final Color foreground;
  final IconData icon;
}

/// Spacing helper: banner + gap below when message is non-null.
class AppFeedbackSlot extends StatelessWidget {
  const AppFeedbackSlot({
    super.key,
    this.message,
    this.kind = AppFeedbackKind.error,
    this.onDismiss,
  });

  final String? message;
  final AppFeedbackKind kind;
  final VoidCallback? onDismiss;

  @override
  Widget build(BuildContext context) {
    if (message == null || message!.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: AppFeedbackBanner(
        message: message!,
        kind: kind,
        onDismiss: onDismiss,
      ),
    );
  }
}
