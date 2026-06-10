import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import 'auth_ui.dart';

enum AuthButtonVariant { primary, secondary, frost, text }

/// Shared auth CTA — primary fill, outline, frost glass, or text link.
class AuthButton extends StatelessWidget {
  const AuthButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = AuthButtonVariant.primary,
    this.loading = false,
    this.loadingLabel,
    this.expand = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final AuthButtonVariant variant;
  final bool loading;
  final String? loadingLabel;
  final bool expand;

  String get _displayLabel {
    final raw = loading ? (loadingLabel ?? label) : label;
    return formatAuthLabel(raw);
  }

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null || loading;

    Widget button;
    switch (variant) {
      case AuthButtonVariant.primary:
        button = ElevatedButton(
          onPressed: disabled ? null : onPressed,
          child: Text(_displayLabel),
        );
      case AuthButtonVariant.secondary:
        button = OutlinedButton(
          onPressed: disabled ? null : onPressed,
          child: Text(_displayLabel),
        );
      case AuthButtonVariant.frost:
        button = _FrostAuthButton(
          label: _displayLabel,
          onPressed: disabled ? null : onPressed,
        );
      case AuthButtonVariant.text:
        button = TextButton(
          onPressed: disabled ? null : onPressed,
          child: Text(
            _displayLabel,
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.2,
              color: disabled ? context.appColors.mutedForeground : context.appColors.foreground,
              decoration: disabled ? null : TextDecoration.underline,
              decorationThickness: 2,
            ),
          ),
        );
    }

    if (!expand) return button;
    return SizedBox(width: double.infinity, child: button);
  }
}

/// Frosted glass CTA for gradient welcome screens — visible border, not solid fill.
class _FrostAuthButton extends StatelessWidget {
  const _FrostAuthButton({
    required this.label,
    this.onPressed,
  });

  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final surface = isDark
        ? Colors.white.withValues(alpha: 0.12)
        : Colors.white.withValues(alpha: 0.42);
    final border = isDark
        ? Colors.white.withValues(alpha: 0.62)
        : colors.border.withValues(alpha: 0.9);
    final labelColor = isDark
        ? Colors.white.withValues(alpha: onPressed == null ? 0.45 : 1)
        : colors.foreground.withValues(alpha: onPressed == null ? 0.45 : 1);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        child: ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: surface,
                border: Border.all(color: border, width: 2),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                child: Center(
                  child: Text(
                    label,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.4,
                      color: labelColor,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
