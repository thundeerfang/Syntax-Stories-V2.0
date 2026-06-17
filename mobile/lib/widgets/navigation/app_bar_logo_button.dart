import 'package:flutter/material.dart';

import '../../theme/app_color_tokens.dart';
import '../ui/app_tappable.dart';
import '../ui/dashed_border_box.dart';
import 'main_app_bar.dart';

/// Header logo with dashed ring — primary until About is opened, then grey.
class AppBarLogoButton extends StatelessWidget {
  const AppBarLogoButton({
    super.key,
    required this.onTap,
    this.visited = false,
  });

  final VoidCallback onTap;
  final bool visited;

  static const ringSize = 40.0;
  static const logoSize = MainAppBar.logoSize;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final ringColor = visited
        ? colors.mutedForeground.withValues(alpha: 0.42)
        : primary;

    return Semantics(
      button: true,
      label: 'About Syntax Stories',
      child: AppTappable(
        onTap: onTap,
        splashColor: appRippleOnSurface(colors),
        borderRadius: BorderRadius.circular(ringSize / 2),
        child: DashedBorderCircle(
          size: ringSize,
          color: ringColor,
          strokeWidth: 2,
          dashLength: 5,
          dashGap: 4,
          child: Image.asset(
            MainAppBar.logoAsset,
            width: logoSize,
            height: logoSize,
            fit: BoxFit.contain,
          ),
        ),
      ),
    );
  }
}
