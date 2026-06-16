import 'package:flutter/material.dart';

import '../../theme/app_color_tokens.dart';

/// Skeleton rows for the notifications inbox initial load.
class NotificationInboxSkeleton extends StatefulWidget {
  const NotificationInboxSkeleton({
    super.key,
    this.count = 8,
    this.physics,
  });

  final int count;
  final ScrollPhysics? physics;

  @override
  State<NotificationInboxSkeleton> createState() => _NotificationInboxSkeletonState();
}

class _NotificationInboxSkeletonState extends State<NotificationInboxSkeleton>
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

    return ListView.separated(
      physics: widget.physics ?? const AlwaysScrollableScrollPhysics(),
      itemCount: widget.count,
      separatorBuilder: (_, _) => Divider(height: 1, color: colors.border.withValues(alpha: 0.7)),
      itemBuilder: (context, index) => _NotificationRowSkeleton(pulse: _pulse),
    );
  }
}

class _NotificationRowSkeleton extends StatelessWidget {
  const _NotificationRowSkeleton({required this.pulse});

  final Animation<double> pulse;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return AnimatedBuilder(
      animation: pulse,
      builder: (context, child) {
        final alpha = 0.22 + (pulse.value * 0.18);
        final bar = colors.muted.withValues(alpha: alpha);

        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  border: Border.all(color: colors.border.withValues(alpha: 0.65), width: 2),
                  color: bar,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(height: 8, width: 72, color: bar),
                    const SizedBox(height: 8),
                    Container(height: 12, width: double.infinity, color: bar),
                    const SizedBox(height: 6),
                    Container(height: 10, width: double.infinity, color: bar),
                    const SizedBox(height: 4),
                    Container(height: 10, width: 220, color: bar),
                    const SizedBox(height: 8),
                    Container(height: 8, width: 56, color: bar),
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
