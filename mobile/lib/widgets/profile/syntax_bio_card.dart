import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import '../../utils/bio_display.dart';

/// Plain profile bio text — no report-style chrome.
class SyntaxBioCard extends StatelessWidget {
  const SyntaxBioCard({
    super.key,
    required this.bio,
    this.horizontalPadding = 20,
  });

  final String? bio;
  final double horizontalPadding;

  @override
  Widget build(BuildContext context) {
    final resolved = resolveProfileBio(bio);
    final plain = bioToPlainText(resolved);
    final display = plain.isNotEmpty ? plain : resolved?.trim() ?? '';

    if (display.isEmpty) {
      return Padding(
        padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
        child: Text(
          'No bio yet.',
          style: GoogleFonts.inter(
            fontSize: 14,
            fontStyle: FontStyle.italic,
            color: context.appColors.mutedForeground,
          ),
        ),
      );
    }

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
      child: Text(
        display,
        style: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          height: 1.55,
          color: context.appColors.foreground.withValues(alpha: 0.82),
        ),
      ),
    );
  }
}
