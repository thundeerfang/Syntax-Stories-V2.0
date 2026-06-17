import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import '../ui/dashed_border_box.dart';

/// Industrial bordered frame used on profile overview sections.
class ProfileOverviewSectionCard extends StatelessWidget {
  const ProfileOverviewSectionCard({
    super.key,
    required this.title,
    required this.icon,
    this.child,
    this.emptyMessage,
    this.isEmpty = false,
    this.onViewAll,
    this.headerOnly = false,
  });

  final String title;
  final IconData icon;
  final Widget? child;
  final String? emptyMessage;
  final bool isEmpty;
  final VoidCallback? onViewAll;
  final bool headerOnly;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

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
                  const _PrimaryBlinkDot(),
                  const SizedBox(width: 8),
                  Icon(icon, size: 16, color: colors.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      title.toUpperCase(),
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.6,
                        color: colors.foreground,
                      ),
                    ),
                  ),
                  if (onViewAll != null) ...[
                    const SizedBox(width: 8),
                    _ViewAllButton(onTap: onViewAll!),
                  ],
                ],
              ),
              if (!headerOnly) ...[
                const SizedBox(height: 14),
                if (isEmpty && emptyMessage != null)
                  DashedBorderBox(
                    color: colors.border.withValues(alpha: 0.55),
                    backgroundColor: colors.muted.withValues(alpha: 0.05),
                    padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
                    child: Text(
                      emptyMessage!.toUpperCase(),
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.2,
                        color: colors.mutedForeground,
                      ),
                    ),
                  )
                else if (child != null)
                  child!,
              ],
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
  }
}

class _ViewAllButton extends StatelessWidget {
  const _ViewAllButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Material(
      color: colors.card,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 2),
            boxShadow: [
              BoxShadow(
                color: colors.shadow.withValues(alpha: 0.1),
                offset: const Offset(2, 2),
                blurRadius: 0,
              ),
            ],
          ),
          child: Text(
            'VIEW ALL',
            style: GoogleFonts.inter(
              fontSize: 8,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.2,
              color: colors.foreground,
            ),
          ),
        ),
      ),
    );
  }
}

class _PrimaryBlinkDot extends StatefulWidget {
  const _PrimaryBlinkDot();

  @override
  State<_PrimaryBlinkDot> createState() => _PrimaryBlinkDotState();
}

class _PrimaryBlinkDotState extends State<_PrimaryBlinkDot> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1300),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final primary = context.appColors.primary;

    return FadeTransition(
      opacity: Tween<double>(begin: 0.35, end: 1).animate(
        CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
      ),
      child: Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(
          color: primary,
          border: Border.all(color: primary.withValues(alpha: 0.45), width: 1),
          boxShadow: [
            BoxShadow(
              color: primary.withValues(alpha: 0.45),
              blurRadius: 6,
            ),
          ],
        ),
      ),
    );
  }
}
