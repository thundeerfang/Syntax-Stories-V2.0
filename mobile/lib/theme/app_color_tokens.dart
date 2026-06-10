import 'package:flutter/material.dart';

/// Semantic app colours — mirrors webapp `globals.css` light/dark CSS variables.
@immutable
class AppColorTokens extends ThemeExtension<AppColorTokens> {
  const AppColorTokens({
    required this.background,
    required this.foreground,
    required this.card,
    required this.inputFill,
    required this.primary,
    required this.primaryHover,
    required this.primaryForeground,
    required this.muted,
    required this.mutedForeground,
    required this.accent,
    required this.border,
    required this.destructive,
    required this.shadow,
    required this.success,
  });

  final Color background;
  final Color foreground;
  final Color card;
  final Color inputFill;
  final Color primary;
  final Color primaryHover;
  final Color primaryForeground;
  final Color muted;
  final Color mutedForeground;
  final Color accent;
  final Color border;
  final Color destructive;
  final Color shadow;
  final Color success;

  /// Light theme — `:root` in webapp `globals.css`.
  static const light = AppColorTokens(
    background: Color(0xFFF5F5F5),
    foreground: Color(0xFF1A1A1A),
    card: Color(0xFFFFFFFF),
    inputFill: Color(0xFFFFFFFF),
    primary: Color(0xFF5F4FE6),
    primaryHover: Color(0xFF4938C2),
    primaryForeground: Color(0xFFFFFFFF),
    muted: Color(0xFFE5E2FE),
    mutedForeground: Color(0xFF5B5686),
    accent: Color(0xFFFED13B),
    border: Color(0xFF3A3A3A),
    destructive: Color(0xFFEF4444),
    shadow: Color(0xFF7C7C86),
    success: Color(0xFF059669),
  );

  /// Dark theme — `.dark` in webapp `globals.css`.
  static const dark = AppColorTokens(
    background: Color(0xFF0F0F12),
    foreground: Color(0xFFF5F5F5),
    card: Color(0xFF111111),
    inputFill: Color(0xFF1C1C22),
    primary: Color(0xFF7B6DF5),
    primaryHover: Color(0xFF5F4FE6),
    primaryForeground: Color(0xFFFFFFFF),
    muted: Color(0xFF3D395A),
    mutedForeground: Color(0xFFA49FCE),
    accent: Color(0xFFFED13B),
    border: Color(0xFF2E2E32),
    destructive: Color(0xFFEF4444),
    shadow: Color(0xFF54545E),
    success: Color(0xFF34D399),
  );

  LinearGradient get welcomeGradient => LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          primary,
          primaryHover,
          Color.lerp(primary, muted, 0.45)!,
          muted,
          background,
        ],
        stops: const [0.0, 0.28, 0.48, 0.72, 1.0],
      );

  @override
  AppColorTokens copyWith({
    Color? background,
    Color? foreground,
    Color? card,
    Color? inputFill,
    Color? primary,
    Color? primaryHover,
    Color? primaryForeground,
    Color? muted,
    Color? mutedForeground,
    Color? accent,
    Color? border,
    Color? destructive,
    Color? shadow,
    Color? success,
  }) {
    return AppColorTokens(
      background: background ?? this.background,
      foreground: foreground ?? this.foreground,
      card: card ?? this.card,
      inputFill: inputFill ?? this.inputFill,
      primary: primary ?? this.primary,
      primaryHover: primaryHover ?? this.primaryHover,
      primaryForeground: primaryForeground ?? this.primaryForeground,
      muted: muted ?? this.muted,
      mutedForeground: mutedForeground ?? this.mutedForeground,
      accent: accent ?? this.accent,
      border: border ?? this.border,
      destructive: destructive ?? this.destructive,
      shadow: shadow ?? this.shadow,
      success: success ?? this.success,
    );
  }

  @override
  AppColorTokens lerp(ThemeExtension<AppColorTokens>? other, double t) {
    if (other is! AppColorTokens) return this;
    Color l(Color a, Color b) => Color.lerp(a, b, t)!;
    return AppColorTokens(
      background: l(background, other.background),
      foreground: l(foreground, other.foreground),
      card: l(card, other.card),
      inputFill: l(inputFill, other.inputFill),
      primary: l(primary, other.primary),
      primaryHover: l(primaryHover, other.primaryHover),
      primaryForeground: l(primaryForeground, other.primaryForeground),
      muted: l(muted, other.muted),
      mutedForeground: l(mutedForeground, other.mutedForeground),
      accent: l(accent, other.accent),
      border: l(border, other.border),
      destructive: l(destructive, other.destructive),
      shadow: l(shadow, other.shadow),
      success: l(success, other.success),
    );
  }
}

extension AppColorTokensContext on BuildContext {
  AppColorTokens get appColors =>
      Theme.of(this).extension<AppColorTokens>() ?? AppColorTokens.light;
}

/// @deprecated Use [AppColorTokens] via [BuildContext.appColors].
typedef AppColors = AppColorTokens;
