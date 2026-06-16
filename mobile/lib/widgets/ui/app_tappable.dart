import 'package:flutter/material.dart';

import '../../theme/app_color_tokens.dart';

/// Visible ripple on filled primary surfaces.
Color appRippleOnPrimary(AppColorTokens colors) =>
    colors.primaryForeground.withValues(alpha: 0.24);

/// Visible ripple on card / neutral surfaces.
Color appRippleOnSurface(AppColorTokens colors) =>
    colors.primary.withValues(alpha: 0.14);

/// Tappable surface with Material ink splash.
///
/// Put background fills and borders on [decoration] (rendered by [Ink]), not on
/// an opaque child [Container] — otherwise the ripple is hidden.
class AppTappable extends StatelessWidget {
  const AppTappable({
    super.key,
    required this.onTap,
    required this.child,
    this.color,
    this.decoration,
    this.padding,
    this.splashColor,
    this.highlightColor,
    this.canRequestFocus = true,
    this.borderRadius,
  });

  final VoidCallback? onTap;
  final Widget child;
  final Color? color;
  final BoxDecoration? decoration;
  final EdgeInsetsGeometry? padding;
  final Color? splashColor;
  final Color? highlightColor;
  final bool canRequestFocus;
  final BorderRadius? borderRadius;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final inkDecoration =
        decoration ?? (color != null ? BoxDecoration(color: color) : null);
    final splash = splashColor ??
        (color == colors.primary ? appRippleOnPrimary(colors) : appRippleOnSurface(colors));
    final highlight = highlightColor ?? splash.withValues(alpha: splash.a * 0.55);
    final content = padding != null ? Padding(padding: padding!, child: child) : child;

    if (inkDecoration == null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: borderRadius,
          splashColor: splash,
          highlightColor: highlight,
          canRequestFocus: canRequestFocus,
          child: content,
        ),
      );
    }

    return Material(
      type: MaterialType.transparency,
      child: Ink(
        decoration: inkDecoration,
        child: InkWell(
          onTap: onTap,
          borderRadius: borderRadius,
          splashColor: splash,
          highlightColor: highlight,
          canRequestFocus: canRequestFocus,
          child: content,
        ),
      ),
    );
  }
}
