import 'package:flutter/material.dart';

import '../../theme/app_color_tokens.dart';

/// Global pull-down refresh — primary spinner on card background.
class AppPullToRefresh extends StatelessWidget {
  const AppPullToRefresh({
    super.key,
    required this.onRefresh,
    required this.child,
    this.displacement = 48,
  });

  final Future<void> Function() onRefresh;
  final Widget child;
  final double displacement;

  static const scrollPhysics = AlwaysScrollableScrollPhysics(
    parent: BouncingScrollPhysics(),
  );

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: context.appColors.primary,
      backgroundColor: context.appColors.card,
      displacement: displacement,
      onRefresh: onRefresh,
      child: child,
    );
  }
}
