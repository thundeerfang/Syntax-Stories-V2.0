import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';

class SettingsEmptyInventory extends StatelessWidget {
  const SettingsEmptyInventory({
    super.key,
    required this.icon,
    required this.message,
    this.action,
  });

  final IconData icon;
  final String message;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      decoration: BoxDecoration(
        border: Border.all(
          color: context.appColors.border.withValues(alpha: 0.45),
          width: 2,
        ),
        color: context.appColors.muted.withValues(alpha: 0.08),
      ),
      child: Column(
        children: [
          Icon(
            icon,
            size: 32,
            color: context.appColors.mutedForeground.withValues(alpha: 0.7),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.5,
              color: context.appColors.mutedForeground,
            ),
          ),
          if (action != null) ...[
            const SizedBox(height: 16),
            action!,
          ],
        ],
      ),
    );
  }
}
