import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme/app_color_tokens.dart';
import '../widgets/navigation/main_app_bar.dart';
import '../widgets/navigation/main_dashboard_scaffold.dart';
import '../widgets/navigation/main_nav_config.dart';
import 'account_profile_screen.dart';
import 'blog/blog_create_screen.dart';
import 'search_screen.dart';
import 'settings/settings_screen.dart';
import 'tabs/placeholder_tab.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  /// Stack index (not [MainTab]) so hot reload survives enum moves.
  int _stackIndex = 0;

  MainTab get _tab => MainNavConfig.tabForStackIndex(_stackIndex);

  void _onBottomNavTap(int index) {
    if (index == MainNavConfig.writeIndex) {
      _openWriteSheet();
      return;
    }
    final next = MainNavConfig.tabForBottomIndex(index);
    if (next != null) {
      setState(() => _stackIndex = MainNavConfig.stackIndexFor(next));
    }
  }

  void _openSearch() {
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => const SearchScreen()),
    );
  }

  void _openNotifications() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => _ComingSoonSheet(
        title: 'Notifications',
        message: 'Your alerts and activity will appear here.',
      ),
    );
  }

  void _openSettings() {
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => const SettingsScreen()),
    );
  }

  void _openWriteSheet() {
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => const BlogCreateScreen()),
    );
  }

  Widget _bodyFor(MainTab tab) {
    return switch (tab) {
      MainTab.home => _staticTab(
          const PlaceholderTab(
            title: 'Home',
            subtitle: 'Your feed and latest stories will appear here.',
            icon: Icons.home_rounded,
          ),
        ),
      MainTab.trending => _staticTab(
          const PlaceholderTab(
            title: 'Trending',
            subtitle: 'See what the community is reading right now.',
            icon: Icons.local_fire_department_rounded,
          ),
        ),
      MainTab.squads => _staticTab(
          const PlaceholderTab(
            title: 'Squads',
            subtitle: 'Your squads and group reading lists will live here.',
            icon: Icons.groups_rounded,
          ),
        ),
      MainTab.account => const AccountProfileScreen(),
    };
  }

  Widget _staticTab(Widget child) {
    return Builder(
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(top: MainAppBar.totalHeight(context)),
          child: child,
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return MainDashboardScaffold(
      title: MainNavConfig.titleFor(_tab),
      selectedTab: _tab,
      onNavTap: _onBottomNavTap,
      onSearch: _openSearch,
      onNotifications: _openNotifications,
      onSettings: _openSettings,
      showNotifications: _tab != MainTab.account,
      body: IndexedStack(
        index: _stackIndex,
        sizing: StackFit.expand,
        children: [
          _bodyFor(MainTab.home),
          _bodyFor(MainTab.trending),
          _bodyFor(MainTab.squads),
          _bodyFor(MainTab.account),
        ],
      ),
    );
  }
}

class _ComingSoonSheet extends StatelessWidget {
  const _ComingSoonSheet({required this.title, required this.message});

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            title.toUpperCase(),
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.2,
              color: context.appColors.foreground,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            style: GoogleFonts.inter(fontSize: 14, color: context.appColors.mutedForeground),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('GOT IT'),
          ),
        ],
      ),
    );
  }
}
