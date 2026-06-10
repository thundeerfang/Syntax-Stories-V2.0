import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import '../../utils/field_validation_rules.dart';
import '../auth/auth_text_field.dart';

/// Portfolio URL — primary background card, separate from social links.
class EditProfilePortfolioCard extends StatelessWidget {
  const EditProfilePortfolioCard({super.key, required this.controller});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final onPrimary = colors.primaryForeground;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.primary,
        border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 2),
        boxShadow: [
          BoxShadow(color: colors.shadow, offset: const Offset(2, 2), blurRadius: 0),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: onPrimary.withValues(alpha: 0.12),
                  border: Border.all(color: onPrimary.withValues(alpha: 0.35), width: 2),
                ),
                child: Icon(Icons.language_rounded, size: 18, color: onPrimary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'PORTFOLIO URL',
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.4,
                        color: onPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Showcase your work with a single link.',
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: onPrimary.withValues(alpha: 0.78),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Theme(
            data: Theme.of(context).copyWith(
              inputDecorationTheme: Theme.of(context).inputDecorationTheme.copyWith(
                    fillColor: colors.inputFill,
                    labelStyle: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.6,
                      color: colors.mutedForeground,
                    ),
                  ),
            ),
            child: AuthTextField(
              controller: controller,
              label: 'PORTFOLIO URL',
              showFieldLabel: false,
              rule: AppFieldRule.portfolioUrl,
              keyboardType: TextInputType.url,
              hintText: 'https://your-portfolio.com',
            ),
          ),
        ],
      ),
    );
  }
}
