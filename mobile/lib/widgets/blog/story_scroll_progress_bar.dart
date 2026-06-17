import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

/// Tracks vertical scroll progress without rebuilding the parent screen.
///
/// Uses [ScrollNotification] (Flutter's standard scroll listener API) and a
/// [ValueNotifier] so only the progress bar repaints while scrolling.
class StoryScrollProgressController {
  StoryScrollProgressController();

  final ValueNotifier<double> progress = ValueNotifier<double>(0);

  /// Feed scroll notifications from a [NotificationListener].
  bool absorbNotification(ScrollNotification notification) {
    if (notification.metrics.axis != Axis.vertical) return false;

    if (notification is ScrollUpdateNotification ||
        notification is ScrollEndNotification ||
        notification is ScrollMetricsNotification) {
      _update(notification.metrics);
    }
    return false;
  }

  void _update(ScrollMetrics metrics) {
    // Match web: scrollY / (scrollHeight - viewport) → pixels / maxScrollExtent.
    final max = metrics.maxScrollExtent;
    final pixels = metrics.pixels;
    final next = max <= 0
        ? 0.0
        : pixels >= max - 1.0
            ? 1.0
            : (pixels / max).clamp(0.0, 1.0);
    if ((progress.value - next).abs() >= 0.002) {
      progress.value = next;
    }
  }

  void dispose() {
    progress.dispose();
  }
}

/// Thin reading-progress strip for story headers.
class StoryScrollProgressBar extends StatelessWidget implements PreferredSizeWidget {
  const StoryScrollProgressBar({
    super.key,
    required this.progress,
    required this.color,
    required this.trackColor,
    this.height = 3,
    this.animationDuration = const Duration(milliseconds: 75),
  });

  final ValueListenable<double> progress;
  final Color color;
  final Color trackColor;
  final double height;
  final Duration animationDuration;

  @override
  Size get preferredSize => Size.fromHeight(height);

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: ValueListenableBuilder<double>(
        valueListenable: progress,
        builder: (context, value, _) {
          return LayoutBuilder(
            builder: (context, constraints) {
              final fillWidth = constraints.maxWidth * value;
              return SizedBox(
                height: height,
                width: constraints.maxWidth,
                child: ColoredBox(
                  color: trackColor,
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: AnimatedContainer(
                      duration: animationDuration,
                      curve: Curves.linear,
                      width: fillWidth,
                      height: height,
                      color: color,
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
