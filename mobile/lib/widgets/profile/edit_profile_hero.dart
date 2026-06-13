import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/user_summary.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/resolve_profile_media_url.dart';
import 'user_avatar.dart';

/// Cover + centered avatar overlapping the bottom edge — edit profile header.
class EditProfileHero extends StatelessWidget {
  const EditProfileHero({
    super.key,
    required this.user,
    this.bannerHeight = 128,
    this.avatarSize = 80,
    this.onEditCover,
    this.onEditAvatar,
  });

  final UserSummary? user;
  final double bannerHeight;
  final double avatarSize;
  final VoidCallback? onEditCover;
  final VoidCallback? onEditAvatar;

  static const frameBorder = 2.0;

  double get _frameSize => avatarSize + frameBorder * 2;

  /// Includes overlapping avatar + edit fab below the cover (for layout + hit testing).
  double get _totalHeight => bannerHeight + (_frameSize / 2) + 4;

  @override
  Widget build(BuildContext context) {
    final cover = resolveProfileMediaUrl(user?.coverBanner);

    return SizedBox(
      height: _totalHeight,
      width: double.infinity,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
        _CoverBanner(height: bannerHeight, coverUrl: cover),
        Positioned(
          top: 12,
          right: 12,
          child: _EditMediaChip(
            icon: Icons.image_outlined,
            label: 'EDIT COVER',
            onTap: onEditCover,
          ),
        ),
        Positioned(
          left: 0,
          right: 0,
          top: bannerHeight - _frameSize / 2,
          child: Center(
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: _frameSize,
                  height: _frameSize,
                  decoration: BoxDecoration(
                    color: context.appColors.card,
                    border: Border.all(
                      color: context.appColors.border.withValues(alpha: 0.85),
                      width: frameBorder,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: context.appColors.shadow,
                        offset: const Offset(2, 2),
                        blurRadius: 0,
                      ),
                    ],
                  ),
                  clipBehavior: Clip.hardEdge,
                  child: UserAvatar(user: user, size: avatarSize, showBorder: false),
                ),
                Positioned(
                  right: -2,
                  bottom: -2,
                  child: _AvatarEditButton(onTap: onEditAvatar),
                ),
              ],
            ),
          ),
        ),
      ],
      ),
    );
  }
}

class _EditMediaChip extends StatelessWidget {
  const _EditMediaChip({
    required this.icon,
    required this.label,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: context.appColors.card.withValues(alpha: 0.92),
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            border: Border.all(
              color: context.appColors.border.withValues(alpha: 0.85),
              width: 2,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 14, color: context.appColors.foreground),
              const SizedBox(width: 6),
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                  color: context.appColors.foreground,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AvatarEditButton extends StatelessWidget {
  const _AvatarEditButton({this.onTap});

  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    final onPrimary = Theme.of(context).colorScheme.onPrimary;

    return Material(
      color: primary,
      elevation: 2,
      child: InkWell(
        onTap: onTap,
        child: SizedBox(
          width: 32,
          height: 32,
          child: Container(
            alignment: Alignment.center,
            decoration: BoxDecoration(
              border: Border.all(color: context.appColors.card, width: 2),
            ),
            child: Icon(Icons.edit_rounded, size: 14, color: onPrimary),
          ),
        ),
      ),
    );
  }
}

class _CoverBanner extends StatelessWidget {
  const _CoverBanner({
    required this.height,
    required this.coverUrl,
  });

  final double height;
  final String coverUrl;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: double.infinity,
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: context.appColors.border.withValues(alpha: 0.85),
            width: 2,
          ),
        ),
      ),
      clipBehavior: Clip.hardEdge,
      child: coverUrl.isNotEmpty
          ? Image.network(
              coverUrl,
              fit: BoxFit.cover,
              width: double.infinity,
              height: height,
              gaplessPlayback: true,
              errorBuilder: (context, error, stackTrace) => const _DefaultCoverGradient(),
            )
          : const _DefaultCoverGradient(),
    );
  }
}

class _DefaultCoverGradient extends StatelessWidget {
  const _DefaultCoverGradient();

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            colors.primary,
            colors.accent,
            Color.lerp(colors.primary, colors.accent, 0.5)!,
            colors.primary,
          ],
          stops: const [0, 0.35, 0.65, 1],
        ),
      ),
    );
  }
}

/// Spacing below [EditProfileHero] so form fields clear the overlapping avatar.
double editProfileHeroBottomInset({
  double avatarSize = 80,
}) {
  final frameSize = avatarSize + EditProfileHero.frameBorder * 2;
  return frameSize / 2 + 20;
}
