import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import '../../utils/bio_display.dart';

/// Profile bio panel — primary border frame with floating BIO label.
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
    final isEmpty = display.isEmpty;

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(top: 12),
            decoration: BoxDecoration(
              color: Colors.transparent,
              border: Border.all(color: context.appColors.primary, width: 2),
            ),
            child: Stack(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 14),
                  child: Text(
                    isEmpty ? 'No bio yet.' : display,
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: isEmpty ? FontWeight.w500 : FontWeight.w500,
                      fontStyle: isEmpty ? FontStyle.italic : FontStyle.normal,
                      height: 1.55,
                      color: isEmpty
                          ? context.appColors.mutedForeground
                          : context.appColors.foreground.withValues(alpha: 0.82),
                    ),
                  ),
                ),
                if (!isEmpty)
                  Positioned(
                    right: 4,
                    bottom: 4,
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        border: Border(
                          right: BorderSide(
                            color: context.appColors.border.withValues(alpha: 0.5),
                            width: 2,
                          ),
                          bottom: BorderSide(
                            color: context.appColors.border.withValues(alpha: 0.5),
                            width: 2,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Positioned(
            top: 0,
            left: 16,
            child: Container(
              color: context.appColors.background,
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                color: context.appColors.primary,
                child: Text(
                  'BIO',
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.6,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
