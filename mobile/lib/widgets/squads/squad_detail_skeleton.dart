import 'package:flutter/material.dart';

import '../../theme/app_color_tokens.dart';
import '../blog/blog_card_skeleton.dart';

/// Squad detail page placeholder — mirrors web `SquadDetailPageSkeleton`.
class SquadDetailSkeleton extends StatefulWidget {
  const SquadDetailSkeleton({super.key});

  @override
  State<SquadDetailSkeleton> createState() => _SquadDetailSkeletonState();
}

class _SquadDetailSkeletonState extends State<SquadDetailSkeleton>
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
    final primary = Theme.of(context).colorScheme.primary;

    return AnimatedBuilder(
      animation: _pulse,
      builder: (context, _) {
        final alpha = 0.22 + (_pulse.value * 0.18);
        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          physics: const NeverScrollableScrollPhysics(),
          children: [
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: colors.border, width: 4),
                boxShadow: [
                  BoxShadow(
                    color: colors.shadow.withValues(alpha: 0.12),
                    offset: const Offset(0, 4),
                    blurRadius: 0,
                  ),
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: Stack(
                children: [
                  SizedBox(
                    height: 220,
                    width: double.infinity,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            primary.withValues(alpha: 0.35),
                            colors.muted.withValues(alpha: 0.45),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.bottomCenter,
                          end: Alignment.topCenter,
                          colors: [
                            Colors.black.withValues(alpha: 0.88),
                            Colors.black.withValues(alpha: 0.35),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Align(
                          alignment: Alignment.topRight,
                          child: _SkBar(width: 96, height: 10, alpha: alpha, color: colors.muted),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _SkBlock(size: 56, alpha: alpha, colors: colors),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      _SkBar(width: 160, height: 16, alpha: alpha, color: colors.muted),
                                      const SizedBox(width: 8),
                                      _SkBlock(width: 52, height: 18, alpha: alpha, colors: colors),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  _SkBar(width: double.infinity, height: 10, alpha: alpha, color: colors.muted),
                                  const SizedBox(height: 6),
                                  _SkBar(width: double.infinity, height: 10, alpha: alpha, color: colors.muted),
                                  const SizedBox(height: 6),
                                  _SkBar(width: 200, height: 10, alpha: alpha, color: colors.muted),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Wrap(
                          spacing: 12,
                          runSpacing: 8,
                          children: [
                            _SkBar(width: 56, height: 8, alpha: alpha, color: colors.muted),
                            _SkBar(width: 48, height: 8, alpha: alpha, color: colors.muted),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                for (var i = 0; i < 3; i++)
                                  Transform.translate(
                                    offset: Offset(i * -6.0, 0),
                                    child: _SkBlock(size: 28, alpha: alpha, colors: colors),
                                  ),
                                const SizedBox(width: 4),
                                _SkBar(width: 72, height: 8, alpha: alpha, color: colors.muted),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _SkBlock(width: 112, height: 40, alpha: alpha, colors: colors),
                            _SkBlock(width: 96, height: 40, alpha: alpha, colors: colors),
                            _SkBlock(width: 40, height: 40, alpha: alpha, colors: colors),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const BlogCardListSkeleton(count: 4),
          ],
        );
      },
    );
  }
}

class _SkBlock extends StatelessWidget {
  const _SkBlock({
    required this.alpha,
    required this.colors,
    this.size,
    this.width,
    this.height,
  });

  final double alpha;
  final AppColorTokens colors;
  final double? size;
  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size ?? width,
      height: size ?? height,
      decoration: BoxDecoration(
        color: colors.muted.withValues(alpha: alpha),
        border: Border.all(color: colors.border.withValues(alpha: 0.65), width: 2),
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
