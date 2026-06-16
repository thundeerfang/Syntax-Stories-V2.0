import 'dart:async';

import 'package:flutter/material.dart';

import '../../models/app_feedback.dart';
import '../../utils/user_message_case.dart';
import 'app_feedback_banner.dart';

/// Floating toast feedback — uses [AppFeedbackBanner] styling (mirrors web Sonner toasts).
class AppFeedbackToast {
  AppFeedbackToast._();

  static OverlayEntry? _entry;
  static Timer? _timer;

  static void show(
    BuildContext context, {
    required String message,
    AppFeedbackKind kind = AppFeedbackKind.error,
    Duration duration = const Duration(seconds: 4),
    double bottomMargin = 16,
  }) {
    if (message.trim().isEmpty) return;

    _dismiss();

    final overlay = Overlay.of(context, rootOverlay: true);
    late OverlayEntry entry;
    entry = OverlayEntry(
      builder: (overlayContext) {
        final bottomInset = MediaQuery.paddingOf(overlayContext).bottom;
        return Positioned(
          left: 16,
          right: 16,
          bottom: bottomMargin + bottomInset,
          child: _AppFeedbackToastCard(
            message: formatUserMessage(message),
            kind: kind,
            onDismiss: () {
              if (_entry == entry) _dismiss();
            },
          ),
        );
      },
    );

    _entry = entry;
    overlay.insert(entry);
    _timer = Timer(duration, _dismiss);
  }

  static void error(
    BuildContext context,
    String message, {
    double bottomMargin = 16,
  }) {
    show(
      context,
      message: message,
      kind: AppFeedbackKind.error,
      bottomMargin: bottomMargin,
    );
  }

  static void success(
    BuildContext context,
    String message, {
    double bottomMargin = 16,
  }) {
    show(
      context,
      message: message,
      kind: AppFeedbackKind.success,
      bottomMargin: bottomMargin,
    );
  }

  static void warning(
    BuildContext context,
    String message, {
    double bottomMargin = 16,
  }) {
    show(
      context,
      message: message,
      kind: AppFeedbackKind.warning,
      bottomMargin: bottomMargin,
    );
  }

  static void _dismiss() {
    _timer?.cancel();
    _timer = null;
    _entry?.remove();
    _entry = null;
  }
}

class _AppFeedbackToastCard extends StatefulWidget {
  const _AppFeedbackToastCard({
    required this.message,
    required this.kind,
    required this.onDismiss,
  });

  final String message;
  final AppFeedbackKind kind;
  final VoidCallback onDismiss;

  @override
  State<_AppFeedbackToastCard> createState() => _AppFeedbackToastCardState();
}

class _AppFeedbackToastCardState extends State<_AppFeedbackToastCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 220),
    reverseDuration: const Duration(milliseconds: 180),
  );

  late final Animation<Offset> _slide = Tween<Offset>(
    begin: const Offset(0, 0.2),
    end: Offset.zero,
  ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));

  late final Animation<double> _fade = CurvedAnimation(
    parent: _controller,
    curve: Curves.easeOut,
  );

  @override
  void initState() {
    super.initState();
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _dismiss() async {
    if (!mounted) return;
    await _controller.reverse();
    if (mounted) widget.onDismiss();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fade,
      child: SlideTransition(
        position: _slide,
        child: Material(
          elevation: 10,
          shadowColor: Colors.black.withValues(alpha: 0.18),
          child: AppFeedbackBanner(
            message: widget.message,
            kind: widget.kind,
            onDismiss: _dismiss,
          ),
        ),
      ),
    );
  }
}
