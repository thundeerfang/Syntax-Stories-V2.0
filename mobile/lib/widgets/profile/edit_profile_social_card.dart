import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import '../../utils/field_validation_rules.dart';
import '../auth/auth_text_field.dart';
import 'social_brand_icon.dart';

enum EditProfileSocialKind { linkedin, github, instagram, youtube }

class EditProfileSocialCard extends StatelessWidget {
  const EditProfileSocialCard({
    super.key,
    required this.linkedin,
    required this.github,
    required this.instagram,
    required this.youtube,
  });

  final TextEditingController linkedin;
  final TextEditingController github;
  final TextEditingController instagram;
  final TextEditingController youtube;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.appColors.card,
        border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
        boxShadow: [
          BoxShadow(color: context.appColors.shadow, offset: const Offset(2, 2), blurRadius: 0),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'SOCIAL LINKS',
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.4,
              color: context.appColors.mutedForeground,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Add your profiles so others can find you.',
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: context.appColors.mutedForeground.withValues(alpha: 0.85),
            ),
          ),
          const SizedBox(height: 16),
          _SocialUrlField(kind: EditProfileSocialKind.linkedin, controller: linkedin, label: 'LINKEDIN'),
          const SizedBox(height: 12),
          _SocialUrlField(kind: EditProfileSocialKind.github, controller: github, label: 'GITHUB'),
          const SizedBox(height: 12),
          _SocialUrlField(kind: EditProfileSocialKind.instagram, controller: instagram, label: 'INSTAGRAM'),
          const SizedBox(height: 12),
          _SocialUrlField(kind: EditProfileSocialKind.youtube, controller: youtube, label: 'YOUTUBE'),
        ],
      ),
    );
  }
}

class _SocialUrlField extends StatelessWidget {
  const _SocialUrlField({
    required this.kind,
    required this.controller,
    required this.label,
  });

  final EditProfileSocialKind kind;
  final TextEditingController controller;
  final String label;

  static AppFieldRule _ruleForKind(EditProfileSocialKind kind) {
    switch (kind) {
      case EditProfileSocialKind.linkedin:
        return AppFieldRule.linkedinUrl;
      case EditProfileSocialKind.github:
        return AppFieldRule.githubUrl;
      case EditProfileSocialKind.instagram:
        return AppFieldRule.instagram;
      case EditProfileSocialKind.youtube:
        return AppFieldRule.youtubeUrl;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SocialIconTile(kind: kind),
        const SizedBox(width: 12),
        Expanded(
            child: AuthTextField(
              controller: controller,
              label: label,
              rule: _ruleForKind(kind),
              keyboardType: kind == EditProfileSocialKind.instagram ? TextInputType.text : TextInputType.url,
            ),
        ),
      ],
    );
  }
}

class _SocialIconTile extends StatelessWidget {
  const _SocialIconTile({required this.kind});

  final EditProfileSocialKind kind;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 44,
      height: 48,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: context.appColors.muted.withValues(alpha: 0.2),
        border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
      ),
      child: _SocialIcon(kind: kind, size: 20),
    );
  }
}

class _SocialIcon extends StatelessWidget {
  const _SocialIcon({required this.kind, required this.size});

  final EditProfileSocialKind kind;
  final double size;

  SocialBrand get _brand => switch (kind) {
        EditProfileSocialKind.linkedin => SocialBrand.linkedin,
        EditProfileSocialKind.github => SocialBrand.github,
        EditProfileSocialKind.instagram => SocialBrand.instagram,
        EditProfileSocialKind.youtube => SocialBrand.youtube,
      };

  @override
  Widget build(BuildContext context) {
    return SocialBrandIcon(brand: _brand, size: size);
  }
}
