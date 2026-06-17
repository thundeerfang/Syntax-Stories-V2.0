import 'package:flutter/material.dart';

enum SettingsGroup { account, security, other }

class SettingsNavItem {
  const SettingsNavItem({
    required this.id,
    required this.label,
    required this.icon,
    required this.description,
    required this.group,
  });

  final String id;
  final String label;
  final IconData icon;
  final String description;
  final SettingsGroup group;
}

const settingsGroupLabels = {
  SettingsGroup.account: 'Account',
  SettingsGroup.security: 'Security',
  SettingsGroup.other: 'Other',
};

/// Mirrors `webapp/src/features/settings/config/nav.ts` (excluding Payments).
const settingsNavItems = <SettingsNavItem>[
  SettingsNavItem(
    id: 'edit-profile',
    label: 'Edit Profile',
    icon: Icons.person_outline_rounded,
    description: 'Name, username, bio, cover, avatar, and portfolio links.',
    group: SettingsGroup.account,
  ),
  SettingsNavItem(
    id: 'stack-tools',
    label: 'Stack & Tools',
    icon: Icons.memory_outlined,
    description: 'Languages, frameworks, and tools you work with.',
    group: SettingsGroup.account,
  ),
  SettingsNavItem(
    id: 'my-setup',
    label: 'My Setup',
    icon: Icons.build_outlined,
    description: 'Your desk, gear, and workspace highlights.',
    group: SettingsGroup.account,
  ),
  SettingsNavItem(
    id: 'certifications',
    label: 'License & Certifications',
    icon: Icons.verified_outlined,
    description: 'Professional licenses and certifications.',
    group: SettingsGroup.account,
  ),
  SettingsNavItem(
    id: 'projects',
    label: 'Projects & Publications',
    icon: Icons.folder_copy_outlined,
    description: 'Featured projects, papers, and publications.',
    group: SettingsGroup.account,
  ),
  SettingsNavItem(
    id: 'open-source',
    label: 'Open Source',
    icon: Icons.code_outlined,
    description: 'Open source repos and contributions.',
    group: SettingsGroup.account,
  ),
  SettingsNavItem(
    id: 'blog-streak',
    label: 'Blog Read Streak',
    icon: Icons.local_fire_department_outlined,
    description: 'How your reading streak is calculated and displayed.',
    group: SettingsGroup.account,
  ),
  SettingsNavItem(
    id: 'security-email',
    label: 'Update email',
    icon: Icons.mail_outline_rounded,
    description: 'Change the email address for your account.',
    group: SettingsGroup.security,
  ),
  SettingsNavItem(
    id: 'connected-accounts',
    label: 'Connected Accounts',
    icon: Icons.link_rounded,
    description: 'OAuth providers and linked sign-in methods.',
    group: SettingsGroup.security,
  ),
  SettingsNavItem(
    id: 'syntax-card',
    label: 'Syntax card',
    icon: Icons.credit_card_outlined,
    description: 'Your square developer identity card — share on social.',
    group: SettingsGroup.other,
  ),
  SettingsNavItem(
    id: 'notifications',
    label: 'Notifications',
    icon: Icons.notifications_none_rounded,
    description: 'Email categories and notification preferences.',
    group: SettingsGroup.other,
  ),
];

SettingsNavItem? settingsNavItemById(String id) {
  for (final item in settingsNavItems) {
    if (item.id == id) return item;
  }
  return null;
}

List<SettingsNavItem> settingsItemsForGroup(SettingsGroup group) {
  return settingsNavItems.where((item) => item.group == group).toList();
}
