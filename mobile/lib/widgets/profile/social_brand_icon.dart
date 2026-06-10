import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../theme/app_color_tokens.dart';

/// Profile / edit-profile social marks — same SVG assets as OAuth row (GitHub) + brand icons.
enum SocialBrand { linkedin, github, instagram, youtube }

class SocialBrandIcon extends StatelessWidget {
  const SocialBrandIcon({
    super.key,
    required this.brand,
    required this.size,
  });

  final SocialBrand brand;
  final double size;

  static const _linkedinAsset = 'assets/icons/linkedin.svg';
  static const _githubAsset = 'assets/icons/github.svg';
  static const _instagramAsset = 'assets/icons/instagram.svg';

  @override
  Widget build(BuildContext context) {
    switch (brand) {
      case SocialBrand.linkedin:
        return SvgPicture.asset(_linkedinAsset, width: size, height: size);
      case SocialBrand.github:
        return SvgPicture.asset(
          _githubAsset,
          width: size,
          height: size,
          colorFilter: ColorFilter.mode(context.appColors.foreground, BlendMode.srcIn),
        );
      case SocialBrand.instagram:
        return SvgPicture.asset(_instagramAsset, width: size, height: size);
      case SocialBrand.youtube:
        return Icon(Icons.play_circle_outline, size: size, color: const Color(0xFFFF0000));
    }
  }
}
