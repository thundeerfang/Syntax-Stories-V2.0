import 'package:flutter/material.dart';

import '../../theme/app_color_tokens.dart';

class ProfileOverviewSkeleton extends StatefulWidget {
  const ProfileOverviewSkeleton({
    super.key,
    this.sectionCount = 3,
  });

  final int sectionCount;

  @override
  State<ProfileOverviewSkeleton> createState() => _ProfileOverviewSkeletonState();
}

class _ProfileOverviewSkeletonState extends State<ProfileOverviewSkeleton>
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < widget.sectionCount; i++) ...[
          if (i > 0) const SizedBox(height: 12),
          _SectionSkeleton(pulse: _pulse),
        ],
      ],
    );
  }
}

class _SectionSkeleton extends StatelessWidget {
  const _SectionSkeleton({required this.pulse});

  final Animation<double> pulse;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return AnimatedBuilder(
      animation: pulse,
      builder: (context, child) {
        final alpha = 0.22 + (pulse.value * 0.18);
        return Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(14, 14, 14, 16),
              decoration: BoxDecoration(
                color: colors.card,
                border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 3),
                boxShadow: [
                  BoxShadow(color: colors.shadow, offset: const Offset(3, 3), blurRadius: 0),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      _Block(width: 8, height: 8, alpha: alpha, colors: colors),
                      const SizedBox(width: 8),
                      _Block(width: 16, height: 16, alpha: alpha, colors: colors),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _Bar(height: 10, alpha: alpha, colors: colors),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  _Bar(height: 44, alpha: alpha, colors: colors),
                  const SizedBox(height: 10),
                  _Bar(height: 44, alpha: alpha * 0.9, colors: colors),
                ],
              ),
            ),
            Positioned(
              top: -3,
              left: -3,
              child: Container(
                width: 16,
                height: 16,
                decoration: BoxDecoration(
                  border: Border(
                    top: BorderSide(color: colors.primary, width: 3),
                    left: BorderSide(color: colors.primary, width: 3),
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

class _Block extends StatelessWidget {
  const _Block({
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
    return Container(
      width: width,
      height: height,
      color: colors.muted.withValues(alpha: alpha),
    );
  }
}

class _Bar extends StatelessWidget {
  const _Bar({
    required this.height,
    required this.alpha,
    required this.colors,
  });

  final double height;
  final double alpha;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: height,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colors.muted.withValues(alpha: alpha),
        ),
      ),
    );
  }
}
