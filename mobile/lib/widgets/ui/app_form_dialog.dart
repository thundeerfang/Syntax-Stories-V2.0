import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';

/// Reusable form dialog shell — matches [ProfileMediaLinkDialog] retro panel + actions.
class AppFormDialog extends StatelessWidget {
  const AppFormDialog({
    super.key,
    required this.title,
    required this.child,
    this.cancelLabel = 'CANCEL',
    this.confirmLabel = 'SAVE',
    this.onCancel,
    this.onConfirm,
    this.confirmEnabled = true,
    this.submitting = false,
    this.showActions = true,
    this.showCloseButton = false,
  });

  final String title;
  final Widget child;
  final String cancelLabel;
  final String confirmLabel;
  final VoidCallback? onCancel;
  final VoidCallback? onConfirm;
  final bool confirmEnabled;
  final bool submitting;
  final bool showActions;
  final bool showCloseButton;

  static Future<T?> show<T>(
    BuildContext context, {
    required WidgetBuilder builder,
    bool barrierDismissible = true,
  }) {
    return showDialog<T>(
      context: context,
      barrierDismissible: barrierDismissible,
      builder: builder,
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Dialog(
      backgroundColor: colors.card,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 400),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: colors.card,
            border: Border.all(
              color: colors.border.withValues(alpha: 0.85),
              width: 2,
            ),
          ),
          child: Stack(
            children: [
              Padding(
                padding: EdgeInsets.fromLTRB(
                  20,
                  24,
                  showCloseButton ? 56 : 20,
                  20,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      title.toUpperCase(),
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 16),
                    child,
                    if (showActions) ...[
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: submitting ? null : onCancel,
                              child: Text(
                                cancelLabel.toUpperCase(),
                                style: GoogleFonts.inter(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: submitting || !confirmEnabled
                                  ? null
                                  : onConfirm,
                              child: submitting
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : Text(
                                      confirmLabel.toUpperCase(),
                                      style: GoogleFonts.inter(
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              if (showCloseButton)
                Positioned(
                  right: 10,
                  top: 10,
                  child: IconButton(
                    onPressed: submitting ? null : onCancel,
                    icon: const Icon(Icons.close_rounded),
                    color: colors.mutedForeground,
                    tooltip: cancelLabel,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
