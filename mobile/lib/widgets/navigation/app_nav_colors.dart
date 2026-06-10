import 'package:flutter/material.dart';

import '../../theme/app_color_tokens.dart';

/// Bottom-nav colours derived from theme + app tokens.
abstract final class AppNavColors {
  /// Elevated panel — distinct from scaffold [AppColorTokens.background].
  static Color barBackground(BuildContext context) {
    final tokens = context.appColors;
    if (Theme.of(context).brightness == Brightness.light) {
      return tokens.card;
    }
    return Color.lerp(tokens.background, tokens.foreground, 0.07)!;
  }

  static Color active(BuildContext context) => Theme.of(context).colorScheme.primary;

  static Color inactive(BuildContext context) => context.appColors.mutedForeground;

  static Color barShadow(BuildContext context) =>
      context.appColors.shadow.withValues(alpha: 0.18);

  static Color writeButtonBackground(BuildContext context) =>
      Theme.of(context).colorScheme.primary;

  static Color writeButtonForeground(BuildContext context) =>
      Theme.of(context).colorScheme.onPrimary;
}
