import 'package:flutter/material.dart';
import 'package:loading_animation_widget/loading_animation_widget.dart';

import '../../theme/app_color_tokens.dart';

/// App-wide loading animation — staggered dots wave.
class AppLoadingIndicator extends StatelessWidget {
  const AppLoadingIndicator({
    super.key,
    this.size = 48,
    this.color,
  });

  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final loaderColor = color ?? context.appColors.primary;
    return LoadingAnimationWidget.staggeredDotsWave(
      color: loaderColor,
      size: size,
    );
  }
}

/// Centered full-area loader used while screens fetch data.
class AppLoadingCenter extends StatelessWidget {
  const AppLoadingCenter({
    super.key,
    this.size = 48,
    this.color,
    this.padding,
  });

  final double size;
  final Color? color;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: padding ?? EdgeInsets.zero,
        child: AppLoadingIndicator(size: size, color: color),
      ),
    );
  }
}
