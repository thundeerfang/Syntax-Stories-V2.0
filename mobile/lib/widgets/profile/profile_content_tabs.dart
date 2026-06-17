import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../ui/app_tappable.dart';
import 'profile_achievements_panel.dart';
import 'profile_bookmarks_panel.dart';
import 'profile_overview_panel.dart';
import 'profile_reposts_panel.dart';

enum ProfileContentTab { overview, reposts, bookmarks, achievements }

class ProfileContentTabs extends StatefulWidget {
  const ProfileContentTabs({
    super.key,
    this.horizontalPadding = 20,
    this.pageScrollController,
  });

  final double horizontalPadding;
  final ScrollController? pageScrollController;

  @override
  State<ProfileContentTabs> createState() => ProfileContentTabsState();
}

class ProfileContentTabsState extends State<ProfileContentTabs> {
  ProfileContentTab _selected = ProfileContentTab.overview;
  final _overviewKey = GlobalKey<ProfileOverviewPanelState>();
  final _repostsKey = GlobalKey<ProfileRepostsPanelState>();
  final _bookmarksKey = GlobalKey<ProfileBookmarksPanelState>();
  final _achievementsKey = GlobalKey<ProfileAchievementsPanelState>();

  static const _tabs = [
    _TabSpec(
      tab: ProfileContentTab.overview,
      label: 'Overview',
      icon: Icons.grid_view_rounded,
    ),
    _TabSpec(
      tab: ProfileContentTab.reposts,
      label: 'Reposts',
      icon: Icons.repeat_rounded,
    ),
    _TabSpec(
      tab: ProfileContentTab.bookmarks,
      label: 'Bookmarks',
      icon: Icons.bookmark_outline_rounded,
    ),
    _TabSpec(
      tab: ProfileContentTab.achievements,
      label: 'Achievements',
      icon: Icons.emoji_events_outlined,
    ),
  ];

  void reloadActiveTab() {
    switch (_selected) {
      case ProfileContentTab.reposts:
        _repostsKey.currentState?.reload();
      case ProfileContentTab.bookmarks:
        _bookmarksKey.currentState?.reload();
      case ProfileContentTab.achievements:
        _achievementsKey.currentState?.reload();
      case ProfileContentTab.overview:
        _overviewKey.currentState?.reload();
    }
  }

  void _selectTab(ProfileContentTab tab) {
    if (_selected == tab) return;
    setState(() => _selected = tab);
    if (tab == ProfileContentTab.achievements) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _achievementsKey.currentState?.reload();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    final bootstrapping = context.watch<AuthState>().bootstrapping;

    return Padding(
      padding: EdgeInsets.fromLTRB(widget.horizontalPadding, 0, widget.horizontalPadding, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                for (var i = 0; i < _tabs.length; i++) ...[
                  if (i > 0) const SizedBox(width: 4),
                  Expanded(
                    child: _ProfileTabButton(
                      spec: _tabs[i],
                      selected: _selected == _tabs[i].tab,
                      onTap: () => _selectTab(_tabs[i].tab),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),
          switch (_selected) {
            ProfileContentTab.overview => ProfileOverviewPanel(
                key: _overviewKey,
                user: user,
                loading: bootstrapping && user == null,
                pageScrollController: widget.pageScrollController,
              ),
            ProfileContentTab.reposts => ProfileRepostsPanel(key: _repostsKey),
            ProfileContentTab.bookmarks => ProfileBookmarksPanel(key: _bookmarksKey),
            ProfileContentTab.achievements => ProfileAchievementsPanel(key: _achievementsKey),
          },
        ],
      ),
    );
  }
}

class _TabSpec {
  const _TabSpec({
    required this.tab,
    required this.label,
    required this.icon,
  });

  final ProfileContentTab tab;
  final String label;
  final IconData icon;
}

class _ProfileTabButton extends StatelessWidget {
  const _ProfileTabButton({
    required this.spec,
    required this.selected,
    required this.onTap,
  });

  final _TabSpec spec;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final fg = selected ? Colors.white : colors.foreground;
    final iconColor = selected ? Colors.white : colors.primary;
    final inactiveBg = colors.muted.withValues(alpha: 0.28);

    return AppTappable(
      onTap: onTap,
      color: selected ? colors.primary : inactiveBg,
      splashColor: selected ? appRippleOnPrimary(colors) : appRippleOnSurface(colors),
      decoration: BoxDecoration(
        color: selected ? colors.primary : inactiveBg,
        border: selected ? Border.all(color: colors.primary, width: 2) : null,
        boxShadow: selected
            ? [
                BoxShadow(
                  color: colors.shadow,
                  offset: const Offset(2, 2),
                  blurRadius: 0,
                ),
              ]
            : null,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(spec.icon, size: 16, color: iconColor),
                const SizedBox(height: 4),
                Text(
                  spec.label.toUpperCase(),
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    fontSize: 7,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.8,
                    height: 1.1,
                    color: fg,
                  ),
                ),
              ],
            ),
          ),
          AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            height: 4,
            width: double.infinity,
            color: selected ? colors.primary : Colors.transparent,
          ),
        ],
      ),
    );
  }
}
