import 'package:flutter/material.dart';

import '../../models/achievement_item.dart';

const achievementCategoryLabels = <AchievementCategory, String>{
  AchievementCategory.engagement: 'Engagement',
  AchievementCategory.profile: 'Profile',
  AchievementCategory.reading: 'Reading',
  AchievementCategory.social: 'Social',
  AchievementCategory.meta: 'Writing',
};

const _iconBySlug = <String, IconData>{
  'everyone-gets-one': Icons.favorite_outline_rounded,
  'daily-syntax-readit': Icons.auto_awesome_outlined,
  'daily-syntax-reader': Icons.menu_book_outlined,
  'daily-syntax-author': Icons.edit_outlined,
  'profile-picture': Icons.photo_camera_outlined,
  'background-banner': Icons.image_outlined,
  'bio-complete': Icons.format_align_left_rounded,
  'github-connected': Icons.code_rounded,
  'stack-and-tools': Icons.memory_outlined,
  'my-setup': Icons.desktop_windows_outlined,
  'follow-three-authors': Icons.people_outline_rounded,
  'follow-three-categories': Icons.layers_outlined,
  'squad-up': Icons.shield_outlined,
  'first-feedback': Icons.chat_bubble_outline_rounded,
  'invite-one-friend': Icons.person_add_outlined,
  'invite-five-friends': Icons.group_add_outlined,
  'invite-ten-friends': Icons.emoji_events_outlined,
};

IconData resolveAchievementIcon(String slug) {
  return _iconBySlug[slug] ?? Icons.emoji_events_outlined;
}

class AchievementCategoryStyle {
  const AchievementCategoryStyle({
    required this.tileBorder,
    required this.tileBackground,
    required this.tileForeground,
    required this.badgeBorder,
    required this.badgeBackground,
    required this.badgeForeground,
  });

  final Color tileBorder;
  final Color tileBackground;
  final Color tileForeground;
  final Color badgeBorder;
  final Color badgeBackground;
  final Color badgeForeground;
}

AchievementCategoryStyle achievementCategoryStyle(
  AchievementCategory category,
  Color primary,
) {
  switch (category) {
    case AchievementCategory.engagement:
      return AchievementCategoryStyle(
        tileBorder: primary.withValues(alpha: 0.45),
        tileBackground: primary.withValues(alpha: 0.1),
        tileForeground: primary,
        badgeBorder: primary.withValues(alpha: 0.3),
        badgeBackground: primary.withValues(alpha: 0.05),
        badgeForeground: primary,
      );
    case AchievementCategory.profile:
      return const AchievementCategoryStyle(
        tileBorder: Color(0x998B5CF6),
        tileBackground: Color(0x1A8B5CF6),
        tileForeground: Color(0xFF7C3AED),
        badgeBorder: Color(0x408B5CF6),
        badgeBackground: Color(0x0D8B5CF6),
        badgeForeground: Color(0xFF7C3AED),
      );
    case AchievementCategory.reading:
      return const AchievementCategoryStyle(
        tileBorder: Color(0x99F59E0B),
        tileBackground: Color(0x1AF59E0B),
        tileForeground: Color(0xFFD97706),
        badgeBorder: Color(0x40F59E0B),
        badgeBackground: Color(0x0DF59E0B),
        badgeForeground: Color(0xFFD97706),
      );
    case AchievementCategory.social:
      return const AchievementCategoryStyle(
        tileBorder: Color(0x990EA5E9),
        tileBackground: Color(0x1A0EA5E9),
        tileForeground: Color(0xFF0284C7),
        badgeBorder: Color(0x400EA5E9),
        badgeBackground: Color(0x0D0EA5E9),
        badgeForeground: Color(0xFF0284C7),
      );
    case AchievementCategory.meta:
      return const AchievementCategoryStyle(
        tileBorder: Color(0x9910B981),
        tileBackground: Color(0x1A10B981),
        tileForeground: Color(0xFF059669),
        badgeBorder: Color(0x4010B981),
        badgeBackground: Color(0x0D10B981),
        badgeForeground: Color(0xFF059669),
      );
  }
}
