import 'package:flutter/material.dart';

import '../theme/retro_theme.dart';

class RetroPanel extends StatelessWidget {
  const RetroPanel({
    super.key,
    required this.child,
    this.title,
    this.accent = RetroTheme.border,
  });

  final Widget child;
  final String? title;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: RetroTheme.surface,
        border: Border.all(color: accent, width: 2),
        boxShadow: [
          BoxShadow(
            color: accent.withValues(alpha: 0.15),
            blurRadius: 12,
            spreadRadius: 0,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (title != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.12),
                border: Border(bottom: BorderSide(color: accent, width: 2)),
              ),
              child: Text(
                title!.toUpperCase(),
                style: Theme.of(context).textTheme.labelLarge?.copyWith(color: accent),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: child,
          ),
        ],
      ),
    );
  }
}
