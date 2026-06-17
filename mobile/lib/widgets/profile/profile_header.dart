import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/user_summary.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/resolve_profile_media_url.dart';
import 'profile_followed_categories_stack.dart';
import 'profile_followed_interests_row.dart';
import 'profile_followed_squads_stack.dart';
import 'profile_social_links.dart';
import 'profile_stats_bar.dart';
import 'syntax_bio_card.dart';
import 'user_avatar.dart';

/// Cover banner + left-aligned avatar overlapping the bottom border.
class ProfileHeader extends StatelessWidget {
  const ProfileHeader({
    super.key,
    required this.user,
    this.followedSquadsKey,
    this.followedCategoriesKey,
    this.coverImageUrl,
    this.bannerHeight = 112,
    this.avatarSize = 76,
    this.horizontalPadding = 20,
    this.showFollowedInterests = true,
    this.showFollowedCategories = true,
    this.squadsUsername,
    this.headerAction,
  });

  final UserSummary? user;
  final GlobalKey<ProfileFollowedSquadsStackState>? followedSquadsKey;
  final GlobalKey<ProfileFollowedCategoriesStackState>? followedCategoriesKey;
  final String? coverImageUrl;
  final double bannerHeight;
  final double avatarSize;
  final double horizontalPadding;
  final bool showFollowedInterests;
  final bool showFollowedCategories;
  final String? squadsUsername;
  final Widget? headerAction;

  static const _frameBorder = 2.0;

  double get _frameSize => avatarSize + _frameBorder * 2;

  @override
  Widget build(BuildContext context) {
    final displayName = user?.displayName ?? 'Account';
    final username = user?.username?.trim();
    final coverRaw = coverImageUrl?.trim().isNotEmpty == true
        ? coverImageUrl
        : user?.coverBanner;
    final cover = resolveProfileMediaUrl(coverRaw);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            _ProfileCoverBanner(
              height: bannerHeight,
              coverUrl: cover,
            ),
            Positioned(
              left: horizontalPadding,
              top: bannerHeight - _frameSize / 2,
              child: Container(
                width: _frameSize,
                height: _frameSize,
                decoration: BoxDecoration(
                  color: context.appColors.card,
                  border: Border.all(
                    color: context.appColors.border.withValues(alpha: 0.85),
                    width: _frameBorder,
                  ),
                  boxShadow: [
          BoxShadow(
                      color: context.appColors.shadow,
                      offset: Offset(2, 2),
                      blurRadius: 0,
                    ),
                  ],
                ),
                clipBehavior: Clip.hardEdge,
                child: UserAvatar(user: user, size: avatarSize, showBorder: false),
              ),
            ),
          ],
        ),
        SizedBox(height: _frameSize / 2 + 14),
        Padding(
          padding: EdgeInsets.fromLTRB(horizontalPadding, 0, horizontalPadding, 16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      displayName.toUpperCase(),
                      style: GoogleFonts.inter(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.6,
                        height: 1.15,
                        color: context.appColors.foreground,
                      ),
                    ),
                    if (username != null && username.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        '@$username',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.8,
                          color: context.appColors.primary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  ProfileSocialLinks(user: user),
                  if (headerAction != null) ...[
                    const SizedBox(height: 8),
                    headerAction!,
                  ],
                ],
              ),
            ],
          ),
        ),
        ProfileStatsBar(
          username: username,
          horizontalPadding: horizontalPadding,
        ),
        if (showFollowedInterests)
          ProfileFollowedInterestsRow(
            squadsKey: followedSquadsKey,
            categoriesKey: followedCategoriesKey,
            horizontalPadding: horizontalPadding,
            squadsUsername: squadsUsername ?? username,
            showFollowedCategories: showFollowedCategories,
          ),
        SyntaxBioCard(
          bio: user?.bio,
          horizontalPadding: horizontalPadding,
        ),
        const SizedBox(height: 8),
      ],
    );
  }
}

class _ProfileCoverBanner extends StatelessWidget {
  const _ProfileCoverBanner({
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
              filterQuality: FilterQuality.medium,
              loadingBuilder: (context, child, progress) {
                if (progress == null) return child;
                return const _DefaultCoverGradient();
              },
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
