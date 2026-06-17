import 'package:flutter/material.dart';

import '../../config/trending_config.dart';
import '../../theme/app_color_tokens.dart';
import '../blog/blog_card.dart';
import '../blog/blog_card_skeleton.dart';

/// Category lane placeholder — mirrors web `TrendingCategoryLaneSkeleton`.
class TrendingCategoryLaneSkeleton extends StatefulWidget {
  const TrendingCategoryLaneSkeleton({super.key});

  @override
  State<TrendingCategoryLaneSkeleton> createState() => _TrendingCategoryLaneSkeletonState();
}

class _TrendingCategoryLaneSkeletonState extends State<TrendingCategoryLaneSkeleton>
    with SingleTickerProviderStateMixin {
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

    return AnimatedBuilder(
      animation: _pulse,
      builder: (context, child) {
        final alpha = 0.22 + (_pulse.value * 0.18);
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
                child: Row(
                  children: [
                    _SkBar(width: 144, height: 24, alpha: alpha, color: colors.muted),
                    const SizedBox(width: 8),
                    _SkCircle(alpha: alpha, colors: colors),
                    const Spacer(),
                    _SkBar(width: 72, height: 24, alpha: alpha, color: colors.muted),
                  ],
                ),
              ),
              SizedBox(
                height: kBlogCardLaneHeight,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: kTrendingPageHorizontalPadding),
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: 3,
                  separatorBuilder: (_, _) => const SizedBox(width: 12),
                  itemBuilder: (_, _) => const SizedBox(
                    width: kBlogCardLaneWidth,
                    child: BlogCardSkeleton(),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _SkCircle extends StatelessWidget {
  const _SkCircle({
    required this.alpha,
    required this.colors,
  });

  final double alpha;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: colors.muted.withValues(alpha: alpha),
        shape: BoxShape.circle,
        border: Border.all(color: colors.border.withValues(alpha: 0.6), width: 1),
      ),
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
