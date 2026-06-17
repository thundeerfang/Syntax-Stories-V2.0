import 'package:flutter/material.dart';

import '../../theme/app_color_tokens.dart';

/// Squad discover card placeholder — mirrors web `SquadCardSkeletonTile`.
class SquadDiscoverCardSkeleton extends StatefulWidget {
  const SquadDiscoverCardSkeleton({super.key});

  @override
  State<SquadDiscoverCardSkeleton> createState() => _SquadDiscoverCardSkeletonState();
}

class _SquadDiscoverCardSkeletonState extends State<SquadDiscoverCardSkeleton>
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
            color: colors.background,
            border: Border.all(color: colors.border, width: 3),
            boxShadow: [
              BoxShadow(
                color: colors.shadow.withValues(alpha: 0.12),
                blurRadius: 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SkBlock(size: 56, alpha: alpha, colors: colors),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _SkBar(width: double.infinity, height: 14, alpha: alpha, color: colors.muted),
                          const SizedBox(height: 8),
                          _SkBar(width: 120, height: 10, alpha: alpha, color: colors.muted),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _SkBar(width: double.infinity, height: 10, alpha: alpha, color: colors.muted),
                const SizedBox(height: 8),
                _SkBar(width: double.infinity, height: 10, alpha: alpha, color: colors.muted),
                const SizedBox(height: 8),
                _SkBar(width: 180, height: 10, alpha: alpha, color: colors.muted),
                const SizedBox(height: 16),
                Row(
                  children: [
                    _SkBlock(width: 56, height: 20, alpha: alpha, colors: colors),
                    const SizedBox(width: 8),
                    _SkBlock(width: 64, height: 20, alpha: alpha, colors: colors),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class SquadDiscoverCardListSkeleton extends StatelessWidget {
  const SquadDiscoverCardListSkeleton({
    super.key,
    this.count = 6,
    this.spacing = 20,
    this.padding = const EdgeInsets.fromLTRB(16, 0, 16, 0),
  });

  final int count;
  final double spacing;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Column(
        children: [
          for (var i = 0; i < count; i++) ...[
            if (i > 0) SizedBox(height: spacing),
            const SquadDiscoverCardSkeleton(),
          ],
        ],
      ),
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
