import 'package:flutter/material.dart';

import '../../theme/app_color_tokens.dart';

/// Bottom-nav colours derived from theme + app tokens.
abstract final class AppNavColors {
  /// Bottom navigation panel background.
  static Color barBackground(BuildContext context) {
    final tokens = context.appColors;
    if (Theme.of(context).brightness == Brightness.light) {
      return tokens.card;
    }
    return tokens.background;
  }

  static Color active(BuildContext context) =>
      Theme.of(context).colorScheme.primary;

  static Color inactive(BuildContext context) =>
      context.appColors.mutedForeground;

  static Color barShadow(BuildContext context) =>
      context.appColors.shadow.withValues(alpha: 0.18);

  /// Subtle hairline under the main dashboard app bar.
  static Color headerDivider(BuildContext context) {
    final tokens = context.appColors;
    final isLight = Theme.of(context).brightness == Brightness.light;
    return tokens.foreground.withValues(alpha: isLight ? 0.1 : 0.14);
  }

  static Color writeButtonBackground(BuildContext context) =>
      Theme.of(context).colorScheme.primary;

  static Color writeButtonForeground(BuildContext context) =>
      Theme.of(context).colorScheme.onPrimary;
}
