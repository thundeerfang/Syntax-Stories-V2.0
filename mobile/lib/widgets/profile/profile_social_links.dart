import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../models/user_summary.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/bio_display.dart';
import 'social_brand_icon.dart';

/// Retro bordered social buttons — matches webapp `PROFILE_PUBLIC_SOCIAL_BTN`.
class ProfileSocialLinks extends StatelessWidget {
  const ProfileSocialLinks({
    super.key,
    required this.user,
    this.iconSize = 20,
    this.buttonSize = 40,
  });

  final UserSummary? user;
  final double iconSize;
  final double buttonSize;

  @override
  Widget build(BuildContext context) {
    final links = _collectLinks(user);
    if (links.isEmpty) return const SizedBox.shrink();

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      alignment: WrapAlignment.end,
      children: links.map((link) => _SocialButton(link: link, size: buttonSize, iconSize: iconSize)).toList(),
    );
  }

  List<_SocialLink> _collectLinks(UserSummary? user) {
    if (user == null) return const [];
    final out = <_SocialLink>[];
    void add(String? url, _SocialKind kind) {
      final trimmed = url?.trim();
      if (trimmed == null || trimmed.isEmpty) return;
      out.add(_SocialLink(url: normalizeExternalUrl(trimmed), kind: kind));
    }

    add(user.portfolioUrl, _SocialKind.portfolio);
    add(user.linkedin, _SocialKind.linkedin);
    add(user.github, _SocialKind.github);
    add(user.instagram, _SocialKind.instagram);
    add(user.youtube, _SocialKind.youtube);
    return out;
  }
}

enum _SocialKind { portfolio, linkedin, github, instagram, youtube }

class _SocialLink {
  const _SocialLink({required this.url, required this.kind});

  final String url;
  final _SocialKind kind;
}

class _SocialButton extends StatelessWidget {
  const _SocialButton({
    required this.link,
    required this.size,
    required this.iconSize,
  });

  final _SocialLink link;
  final double size;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: context.appColors.card,
      child: InkWell(
        onTap: () => _openUrl(link.url),
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
            boxShadow: [
          BoxShadow(color: context.appColors.shadow, offset: Offset(2, 2), blurRadius: 0),
            ],
          ),
          alignment: Alignment.center,
          child: _SocialIcon(kind: link.kind, size: iconSize),
        ),
      ),
    );
  }

  Future<void> _openUrl(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}

class _SocialIcon extends StatelessWidget {
  const _SocialIcon({required this.kind, required this.size});

  final _SocialKind kind;
  final double size;

  SocialBrand? get _brand => switch (kind) {
        _SocialKind.linkedin => SocialBrand.linkedin,
        _SocialKind.github => SocialBrand.github,
        _SocialKind.instagram => SocialBrand.instagram,
        _SocialKind.youtube => SocialBrand.youtube,
        _SocialKind.portfolio => null,
      };

  @override
  Widget build(BuildContext context) {
    final brand = _brand;
    if (brand != null) {
      return SocialBrandIcon(brand: brand, size: size);
    }
    return Icon(Icons.language, size: size, color: context.appColors.primary);
  }
}
