import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import '../profile/profile_primary_add_button.dart';

/// Counter row used on Stack & Tools and My Setup inventory sections.
class SettingsInventoryHeader extends StatelessWidget {
  const SettingsInventoryHeader({
    super.key,
    required this.title,
    required this.count,
    required this.max,
    this.onAdd,
    this.primaryAddButton = false,
  });

  final String title;
  final int count;
  final int max;
  final VoidCallback? onAdd;
  final bool primaryAddButton;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Text(
            title,
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.4,
              color: context.appColors.mutedForeground,
            ),
          ),
        ),
        if (onAdd != null) ...[
          primaryAddButton
              ? ProfilePrimaryAddButton(onPressed: onAdd, size: 32)
              : Material(
                  color: context.appColors.card,
                  child: InkWell(
                    onTap: onAdd,
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: context.appColors.border.withValues(alpha: 0.85),
                          width: 2,
                        ),
                      ),
                      child: Icon(Icons.add_rounded, size: 18, color: context.appColors.primary),
                    ),
                  ),
                ),
          const SizedBox(width: 8),
        ],
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: context.appColors.muted.withValues(alpha: 0.25),
            border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
          ),
          child: Text(
            '$count/$max',
            style: GoogleFonts.inter(
              fontSize: 9,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.6,
              color: context.appColors.mutedForeground,
            ),
          ),
        ),
      ],
    );
  }
}
