import 'package:flutter/material.dart';

import '../../theme/app_color_tokens.dart';

/// Pulsing home hero placeholder — mirrors web `HomeHeroSkeleton`.
class HomeHeroSkeleton extends StatefulWidget {
  const HomeHeroSkeleton({super.key});

  @override
  State<HomeHeroSkeleton> createState() => _HomeHeroSkeletonState();
}

class _HomeHeroSkeletonState extends State<HomeHeroSkeleton> with SingleTickerProviderStateMixin {
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
        return Stack(
          fit: StackFit.expand,
          children: [
            ColoredBox(color: colors.muted.withValues(alpha: alpha * 0.65)),
            Positioned(
              left: 16,
              top: 16,
              child: Row(
                children: List.generate(
                  4,
                  (i) => Padding(
                    padding: EdgeInsets.only(right: i < 3 ? 6 : 0),
                    child: _SkBlock(
                      size: 12,
                      alpha: alpha,
                      color: colors.muted,
                      borderColor: colors.border.withValues(alpha: 0.5),
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              right: 16,
              top: 16,
              child: Transform.rotate(
                angle: 0.2,
                child: _SkBlock(
                  width: 68,
                  height: 52,
                  alpha: alpha,
                  color: colors.muted,
                  borderColor: colors.border.withValues(alpha: 0.55),
                ),
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [
                      colors.muted.withValues(alpha: 0.5),
                      colors.muted.withValues(alpha: 0.15),
                      Colors.transparent,
                    ],
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 64, 24, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _SkBar(width: 112, height: 24, alpha: alpha, color: primary),
                      const SizedBox(height: 12),
                      _SkBar(width: double.infinity, height: 28, alpha: alpha, color: colors.muted),
                      const SizedBox(height: 8),
                      _SkBar(width: 220, height: 28, alpha: alpha, color: colors.muted),
                      const SizedBox(height: 16),
                      _SkBar(width: 56, height: 10, alpha: alpha, color: colors.muted),
                      const SizedBox(height: 8),
                      _SkBar(width: double.infinity, height: 16, alpha: alpha, color: colors.muted),
                      const SizedBox(height: 6),
                      _SkBar(width: 200, height: 16, alpha: alpha, color: colors.muted),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          _SkBlock(
                            size: 40,
                            alpha: alpha,
                            color: colors.muted,
                            borderColor: colors.border.withValues(alpha: 0.45),
                          ),
                          const SizedBox(width: 10),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _SkBar(width: 96, height: 10, alpha: alpha, color: colors.muted),
                              const SizedBox(height: 6),
                              _SkBar(width: 64, height: 10, alpha: alpha, color: colors.muted),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _SkBlock extends StatelessWidget {
  const _SkBlock({
    required this.alpha,
    required this.color,
    this.size,
    this.width,
    this.height,
    this.borderColor,
  });

  final double alpha;
  final Color color;
  final double? size;
  final double? width;
  final double? height;
  final Color? borderColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size ?? width,
      height: size ?? height,
      decoration: BoxDecoration(
        color: color.withValues(alpha: alpha),
        border: borderColor == null ? null : Border.all(color: borderColor!, width: 2),
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
