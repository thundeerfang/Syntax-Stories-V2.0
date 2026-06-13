import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../settings/settings_nav.dart';
import '../../state/auth_state.dart';
import '../../widgets/settings/settings_section_scaffold.dart';

class SettingsSectionScreen extends StatelessWidget {
  const SettingsSectionScreen({super.key, required this.item});

  final SettingsNavItem item;

  @override
  Widget build(BuildContext context) {
    return SettingsSectionScaffold(
      title: item.label,
      description: item.description,
      icon: item.icon,
      onRefresh: () => context.read<AuthState>().refreshUser(),
      body: const SettingsComingSoonPanel(),
    );
  }
}
