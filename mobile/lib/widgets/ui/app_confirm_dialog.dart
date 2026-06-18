import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';

enum AppConfirmDialogVariant { danger, warning, logout }

/// Reusable confirmation dialog — mirrors webapp `ConfirmDialog` danger/warning tones.
class AppConfirmDialog extends StatelessWidget {
  const AppConfirmDialog({
    super.key,
    required this.title,
    required this.message,
    this.confirmLabel = 'CONFIRM',
    this.cancelLabel = 'CANCEL',
    this.confirming = false,
    this.variant = AppConfirmDialogVariant.danger,
  });

  final String title;
  final String message;
  final String confirmLabel;
  final String cancelLabel;
  final bool confirming;
  final AppConfirmDialogVariant variant;

  /// Returns `true` when confirmed, `false` when cancelled, `null` when dismissed.
  static Future<bool?> show(
    BuildContext context, {
    required String title,
    required String message,
    String confirmLabel = 'CONFIRM',
    String cancelLabel = 'CANCEL',
    bool barrierDismissible = true,
    AppConfirmDialogVariant variant = AppConfirmDialogVariant.danger,
  }) {
    return showDialog<bool>(
      context: context,
      barrierDismissible: barrierDismissible,
      builder: (context) => AppConfirmDialog(
        title: title,
        message: message,
        confirmLabel: confirmLabel,
        cancelLabel: cancelLabel,
        variant: variant,
      ),
    );
  }

  static Color _accentFor(AppConfirmDialogVariant variant, Color destructive) {
    switch (variant) {
      case AppConfirmDialogVariant.danger:
        return destructive;
      case AppConfirmDialogVariant.warning:
        return const Color(0xFFFFB000);
      case AppConfirmDialogVariant.logout:
        return destructive;
    }
  }

  static IconData _iconFor(AppConfirmDialogVariant variant) {
    switch (variant) {
      case AppConfirmDialogVariant.danger:
        return Icons.delete_outline_rounded;
      case AppConfirmDialogVariant.warning:
        return Icons.warning_amber_rounded;
      case AppConfirmDialogVariant.logout:
        return Icons.logout_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final accent = _accentFor(variant, colors.destructive);
    const panelBlack = Color(0xFF111111);
    const panelBlackDeep = Color(0xFF0A0A0A);

    return Dialog(
      backgroundColor: panelBlack,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 360),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: panelBlack,
            border: Border.all(color: accent.withValues(alpha: 0.45), width: 2),
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Color.lerp(panelBlack, accent, 0.42)!,
                Color.lerp(panelBlack, accent, 0.22)!,
                panelBlackDeep,
              ],
              stops: const [0.0, 0.42, 1.0],
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.18),
                    border: Border.all(color: accent.withValues(alpha: 0.55), width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.35),
                        offset: const Offset(2, 2),
                        blurRadius: 0,
                      ),
                    ],
                  ),
                  child: Icon(
                    _iconFor(variant),
                    size: 32,
                    color: accent,
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  title.toUpperCase(),
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.6,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  message,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    height: 1.45,
                    fontWeight: FontWeight.w500,
                    color: Colors.white.withValues(alpha: 0.72),
                  ),
                ),
                const SizedBox(height: 28),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: confirming ? null : () => Navigator.of(context).pop(false),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: BorderSide(color: Colors.white.withValues(alpha: 0.35), width: 2),
                          backgroundColor: panelBlackDeep,
                        ),
                        child: Text(
                          cancelLabel.toUpperCase(),
                          style: GoogleFonts.inter(fontWeight: FontWeight.w900, letterSpacing: 0.8),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: confirming ? null : () => Navigator.of(context).pop(true),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: accent,
                          foregroundColor: variant == AppConfirmDialogVariant.warning
                              ? const Color(0xFF1A1200)
                              : Colors.white,
                          disabledBackgroundColor: accent.withValues(alpha: 0.45),
                          disabledForegroundColor: Colors.white.withValues(alpha: 0.85),
                        ),
                        child: confirming
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : Text(
                                confirmLabel.toUpperCase(),
                                style: GoogleFonts.inter(fontWeight: FontWeight.w900, letterSpacing: 0.8),
                              ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
