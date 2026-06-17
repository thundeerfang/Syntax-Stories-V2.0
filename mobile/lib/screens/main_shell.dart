import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/auth_state.dart';
import '../state/notification_state.dart';
import '../widgets/ui/app_feedback_toast.dart';
import '../services/about_visit_storage.dart';
import '../widgets/navigation/main_dashboard_scaffold.dart';
import '../widgets/navigation/main_nav_config.dart';
import 'about_screen.dart';
import 'account_profile_screen.dart';
import 'blog/blog_create_screen.dart';
import 'notifications_inbox_screen.dart';
import 'search_screen.dart';
import 'settings/settings_screen.dart';
import 'tabs/home_tab.dart';
import 'tabs/trending_tab.dart';
import 'squads/create_squad_screen.dart';
import 'tabs/squads_screen.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  final _squadsKey = GlobalKey<SquadsScreenState>();

  /// Stack index (not [MainTab]) so hot reload survives enum moves.
  int _stackIndex = 0;
  bool _aboutVisited = false;

  @override
  void initState() {
    super.initState();
    _loadAboutVisited();
  }

  Future<void> _loadAboutVisited() async {
    final visited = await AboutVisitStorage.hasVisited();
    if (!mounted) return;
    setState(() => _aboutVisited = visited);
  }

  Future<void> _openAbout() async {
    await AboutVisitStorage.markVisited();
    if (!mounted) return;
    setState(() => _aboutVisited = true);
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => const AboutScreen()),
    );
  }

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
    NotificationsInboxScreen.open(context);
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

  Future<void> _openCreateSquad() async {
    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      AppFeedbackToast.warning(context, 'Sign in to create a squad.');
      return;
    }
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(builder: (_) => const CreateSquadScreen()),
    );
    if (created == true) {
      await _squadsKey.currentState?.reload();
    }
  }

  Widget _bodyFor(MainTab tab) {
    return switch (tab) {
      MainTab.home => const HomeTab(),
      MainTab.trending => const TrendingTab(key: ValueKey('trending_tab')),
      MainTab.squads => SquadsScreen(key: _squadsKey),
      MainTab.account => const AccountProfileScreen(),
    };
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = context.watch<NotificationState>().unreadCount;
    return MainDashboardScaffold(
      title: MainNavConfig.titleFor(_tab),
      selectedTab: _tab,
      onNavTap: _onBottomNavTap,
      onSearch: _openSearch,
      onNotifications: _openNotifications,
      onSettings: _openSettings,
      onLogoTap: _openAbout,
      aboutVisited: _aboutVisited,
      onCreate: _tab == MainTab.squads ? _openCreateSquad : null,
      showNotifications: _tab != MainTab.account && _tab != MainTab.squads,
      notificationUnreadCount: unreadCount,
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
