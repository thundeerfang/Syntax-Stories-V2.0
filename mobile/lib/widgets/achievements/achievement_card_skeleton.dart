import 'package:flutter/material.dart';

import '../../theme/app_color_tokens.dart';

class AchievementCardSkeleton extends StatefulWidget {
  const AchievementCardSkeleton({super.key});

  @override
  State<AchievementCardSkeleton> createState() => _AchievementCardSkeletonState();
}

class AchievementGridSkeleton extends StatelessWidget {
  const AchievementGridSkeleton({
    super.key,
    this.count = 6,
    this.spacing = 12,
  });

  final int count;
  final double spacing;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: spacing,
        mainAxisSpacing: spacing,
        childAspectRatio: 1,
      ),
      itemCount: count,
      itemBuilder: (_, index) => const AchievementCardSkeleton(),
    );
  }
}

class _AchievementCardSkeletonState extends State<AchievementCardSkeleton>
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
        return AspectRatio(
          aspectRatio: 1,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: colors.card,
              border: Border.all(color: colors.border, width: 2),
              boxShadow: [
                BoxShadow(
                  color: colors.shadow.withValues(alpha: 0.08),
                  offset: const Offset(2, 2),
                  blurRadius: 0,
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      _Block(size: 48, alpha: alpha, colors: colors),
                      const Spacer(),
                      _Bar(width: 52, height: 18, alpha: alpha, colors: colors),
                    ],
                  ),
                  const SizedBox(height: 10),
                  _Bar(width: double.infinity, height: 10, alpha: alpha, colors: colors),
                  const SizedBox(height: 6),
                  _Bar(width: 72, height: 8, alpha: alpha, colors: colors),
                  const SizedBox(height: 8),
                  _Bar(width: double.infinity, height: 8, alpha: alpha, colors: colors),
                  const SizedBox(height: 4),
                  _Bar(width: 120, height: 8, alpha: alpha, colors: colors),
                  const Spacer(),
                  _Bar(width: double.infinity, height: 8, alpha: alpha * 0.85, colors: colors),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _Block extends StatelessWidget {
  const _Block({
    required this.size,
    required this.alpha,
    required this.colors,
  });

  final double size;
  final double alpha;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: colors.muted.withValues(alpha: alpha),
        border: Border.all(color: colors.border, width: 2),
      ),
    );
  }
}

class _Bar extends StatelessWidget {
  const _Bar({
    required this.width,
    required this.height,
    required this.alpha,
    required this.colors,
  });

  final double width;
  final double height;
  final double alpha;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      height: height,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colors.muted.withValues(alpha: alpha),
        ),
      ),
    );
  }
}
