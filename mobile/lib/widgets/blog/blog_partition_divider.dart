import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';

/// Section divider — mirrors webapp `PartitionBlock` (lines + `#` center).
class BlogPartitionDivider extends StatelessWidget {
  const BlogPartitionDivider({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final lineColor = colors.border.withValues(alpha: 0.55);
    final glyphColor = colors.mutedForeground.withValues(alpha: 0.45);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 28),
      child: Opacity(
        opacity: 0.55,
        child: Row(
          children: [
            Expanded(
              child: Container(
                height: 2,
                color: lineColor,
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Text(
                '#',
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                  color: glyphColor,
                  height: 1,
                ),
              ),
            ),
            Expanded(
              child: Container(
                height: 2,
                color: lineColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
