import 'package:flutter/material.dart';

import '../../theme/app_color_tokens.dart';

/// Pulsing blog feed card placeholder — mirrors webapp `FollowingBlogCardSkeletonTile`.
class BlogCardSkeleton extends StatefulWidget {
  const BlogCardSkeleton({super.key});

  @override
  State<BlogCardSkeleton> createState() => _BlogCardSkeletonState();
}

class BlogCardListSkeleton extends StatelessWidget {
  const BlogCardListSkeleton({
    super.key,
    this.count = 4,
    this.spacing = 16,
  });

  final int count;
  final double spacing;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < count; i++) ...[
          if (i > 0) SizedBox(height: spacing),
          const BlogCardSkeleton(),
        ],
      ],
    );
  }
}

class _BlogCardSkeletonState extends State<BlogCardSkeleton>
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
        return DecoratedBox(
          decoration: BoxDecoration(
            color: colors.card,
            border: Border.all(color: colors.border, width: 3),
            boxShadow: [
              BoxShadow(
                color: colors.shadow.withValues(alpha: 0.14),
                offset: const Offset(4, 4),
                blurRadius: 0,
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _SkeletonBlock(
                height: 160,
                opacity: alpha,
                color: colors.muted,
                border: Border(
                  bottom: BorderSide(color: colors.border, width: 3),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 10, 10, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        _SkeletonBlock(
                          height: 22,
                          width: 96,
                          opacity: alpha,
                          color: colors.primary,
                          border: Border.all(color: colors.primary.withValues(alpha: 0.3), width: 2),
                        ),
                        const Spacer(),
                        _SkeletonBar(width: 32, height: 8, opacity: alpha, color: colors.muted),
                      ],
                    ),
                    const SizedBox(height: 10),
                    _SkeletonBar(width: double.infinity, height: 14, opacity: alpha, color: colors.muted),
                    const SizedBox(height: 6),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: _SkeletonBar(
                        width: MediaQuery.sizeOf(context).width * 0.52,
                        height: 14,
                        opacity: alpha,
                        color: colors.muted,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _SkeletonBlock(
                          height: 32,
                          width: 32,
                          opacity: alpha,
                          color: colors.muted,
                          border: Border.all(color: colors.border, width: 2),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _SkeletonBar(width: 96, height: 10, opacity: alpha, color: colors.muted),
                              const SizedBox(height: 6),
                              _SkeletonBar(width: 72, height: 8, opacity: alpha, color: colors.muted),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        for (var i = 0; i < 4; i++) ...[
                          if (i > 0) ...[
                            Container(
                              width: 3,
                              height: 3,
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: colors.mutedForeground.withValues(alpha: 0.25),
                              ),
                            ),
                          ],
                          SizedBox(
                            width: 18,
                            height: 18,
                            child: Stack(
                              clipBehavior: Clip.none,
                              children: [
                                Align(
                                  alignment: Alignment.center,
                                  child: _SkeletonBar(
                                    width: 12,
                                    height: 12,
                                    opacity: alpha * 0.85,
                                    color: colors.muted,
                                  ),
                                ),
                                if (i == 3)
                                  Positioned(
                                    right: -4,
                                    top: -4,
                                    child: _SkeletonBlock(
                                      height: 10,
                                      width: 10,
                                      opacity: alpha,
                                      color: colors.primary,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _SkeletonBlock extends StatelessWidget {
  const _SkeletonBlock({
    required this.height,
    required this.opacity,
    required this.color,
    this.width,
    this.border,
  });

  final double height;
  final double? width;
  final double opacity;
  final Color color;
  final BoxBorder? border;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: color.withValues(alpha: opacity),
        border: border,
      ),
    );
  }
}

class _SkeletonBar extends StatelessWidget {
  const _SkeletonBar({
    required this.width,
    required this.height,
    required this.opacity,
    required this.color,
  });

  final double width;
  final double height;
  final double opacity;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      height: height,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: color.withValues(alpha: opacity),
        ),
      ),
    );
  }
}
