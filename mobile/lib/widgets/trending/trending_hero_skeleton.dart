import 'package:flutter/material.dart';

import '../../theme/app_color_tokens.dart';
import 'trending_stacked_hero.dart';

/// Stacked-card trending hero placeholder — mirrors web `TrendingStackedHeroSkeleton`.
class TrendingHeroSkeleton extends StatefulWidget {
  const TrendingHeroSkeleton({super.key});

  @override
  State<TrendingHeroSkeleton> createState() => _TrendingHeroSkeletonState();
}

class _TrendingHeroSkeletonState extends State<TrendingHeroSkeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;

    return AnimatedBuilder(
      animation: _pulse,
      builder: (context, child) {
        final alpha = 0.22 + (_pulse.value * 0.18);
        return SizedBox(
          height: TrendingStackedHero.stageHeight,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final w = constraints.maxWidth;
              return Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned(
                    right: w * 0.08,
                    top: 0,
                    width: w * 0.38,
                    height: TrendingStackedHero.stageHeight,
                    child: _SkCard(alpha: alpha * 0.75, colors: colors),
                  ),
                  Positioned(
                    right: w * 0.005,
                    top: 0,
                    width: w * 0.30,
                    height: TrendingStackedHero.stageHeight,
                    child: _SkCard(alpha: alpha * 0.55, colors: colors, pulse: false),
                  ),
                  Positioned(
                    left: 0,
                    top: 0,
                    width: w * 0.64,
                    height: TrendingStackedHero.stageHeight,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: colors.card,
                        border: Border.all(color: colors.border, width: 2),
                        boxShadow: [
                          BoxShadow(
                            color: colors.shadow.withValues(alpha: 0.12),
                            offset: const Offset(4, 4),
                            blurRadius: 0,
                          ),
                        ],
                      ),
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          ColoredBox(color: colors.muted.withValues(alpha: alpha)),
                          Positioned(
                            left: 16,
                            right: 16,
                            bottom: 16,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _SkBar(width: 96, height: 12, alpha: alpha, color: primary),
                                const SizedBox(height: 10),
                                _SkBar(width: w * 0.52, height: 28, alpha: alpha, color: colors.muted),
                                const SizedBox(height: 8),
                                _SkBar(width: w * 0.36, height: 16, alpha: alpha, color: colors.muted),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        );
      },
    );
  }
}

class _SkCard extends StatelessWidget {
  const _SkCard({
    required this.alpha,
    required this.colors,
    this.pulse = true,
  });

  final double alpha;
  final AppColorTokens colors;
  final bool pulse;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colors.card,
        border: Border.all(color: colors.border, width: 2),
      ),
      child: ColoredBox(color: colors.muted.withValues(alpha: pulse ? alpha : alpha * 0.85)),
    );
  }
}

class _SkBar extends StatelessWidget {
  const _SkBar({
    required this.width,
    required this.height,
    required this.alpha,
    required this.color,
  });

  final double width;
  final double height;
  final double alpha;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      height: height,
      child: ColoredBox(color: color.withValues(alpha: alpha)),
    );
  }
}
