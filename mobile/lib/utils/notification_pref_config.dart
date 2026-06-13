import 'package:flutter/material.dart';

import '../models/notification_preferences.dart';

class NotificationPrefItem {
  const NotificationPrefItem({
    required this.key,
    required this.label,
    required this.hint,
    required this.icon,
  });

  final String key;
  final String label;
  final String hint;
  final IconData icon;
}

const notificationMasterPref = NotificationPrefItem(
  key: notificationPrefKeyInApp,
  label: 'In-app alerts',
  hint: 'Bell inbox and live alerts while you are signed in.',
  icon: Icons.notifications_none_rounded,
);

const notificationCategoryPrefs = [
  NotificationPrefItem(
    key: notificationPrefKeyMilestones,
    label: 'Engagement milestones',
    hint: 'Reposts, views, and respects at 100 / 500 / 1K.',
    icon: Icons.favorite_border_rounded,
  ),
  NotificationPrefItem(
    key: notificationPrefKeyAchievements,
    label: 'Achievements',
    hint: 'Badge unlocks, XP, and level-up alerts.',
    icon: Icons.emoji_events_outlined,
  ),
  NotificationPrefItem(
    key: notificationPrefKeyFollowing,
    label: 'Following feed',
    hint: 'New posts from people you follow.',
    icon: Icons.people_outline_rounded,
  ),
  NotificationPrefItem(
    key: notificationPrefKeyCategories,
    label: 'Categories',
    hint: 'Posts in categories you follow.',
    icon: Icons.label_outline_rounded,
  ),
  NotificationPrefItem(
    key: notificationPrefKeyTags,
    label: 'Topics & tags',
    hint: 'Posts on topics you follow.',
    icon: Icons.sell_outlined,
  ),
  NotificationPrefItem(
    key: notificationPrefKeySquads,
    label: 'Squads',
    hint: 'New squad posts and squad milestones.',
    icon: Icons.groups_outlined,
  ),
  NotificationPrefItem(
    key: notificationPrefKeyTrending,
    label: 'Trending',
    hint: 'When your posts hit the trending section.',
    icon: Icons.local_fire_department_outlined,
  ),
  NotificationPrefItem(
    key: notificationPrefKeyReferrals,
    label: 'Invites',
    hint: 'When a friend accepts your invite.',
    icon: Icons.person_add_outlined,
  ),
  NotificationPrefItem(
    key: notificationPrefKeySettings,
    label: 'Account & settings',
    hint: 'Profile, education, email, and settings changes.',
    icon: Icons.settings_outlined,
  ),
];
