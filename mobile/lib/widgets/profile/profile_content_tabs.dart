import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import 'profile_overview_panel.dart';

enum ProfileContentTab { overview, reposts, bookmarks, achievements }

class ProfileContentTabs extends StatefulWidget {
  const ProfileContentTabs({
    super.key,
    this.horizontalPadding = 20,
  });

  final double horizontalPadding;

  @override
  State<ProfileContentTabs> createState() => _ProfileContentTabsState();
}

class _ProfileContentTabsState extends State<ProfileContentTabs> {
  ProfileContentTab _selected = ProfileContentTab.overview;

  static const _tabs = [
    _TabSpec(
      tab: ProfileContentTab.overview,
      label: 'Overview',
      icon: Icons.grid_view_rounded,
      emptyMessage: 'Your profile overview will appear here.',
    ),
    _TabSpec(
      tab: ProfileContentTab.reposts,
      label: 'Reposts',
      icon: Icons.repeat_rounded,
      emptyMessage: 'No reposts yet.',
    ),
    _TabSpec(
      tab: ProfileContentTab.bookmarks,
      label: 'Bookmarks',
      icon: Icons.bookmark_outline_rounded,
      emptyMessage: 'No bookmarks yet.',
    ),
    _TabSpec(
      tab: ProfileContentTab.achievements,
      label: 'Achievements',
      icon: Icons.emoji_events_outlined,
      emptyMessage: 'No achievements unlocked yet.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final spec = _tabs.firstWhere((t) => t.tab == _selected);
    final user = context.watch<AuthState>().user;

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
                      onTap: () => setState(() => _selected = _tabs[i].tab),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (_selected == ProfileContentTab.overview)
            ProfileOverviewPanel(user: user)
          else
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: context.appColors.card,
                border: Border.all(
                  color: context.appColors.border.withValues(alpha: 0.85),
                  width: 4,
                ),
                boxShadow: [
                  BoxShadow(
                    color: context.appColors.shadow,
                    offset: Offset(4, 4),
                    blurRadius: 0,
                  ),
                ],
              ),
              child: _ProfileTabPanel(
                icon: spec.icon,
                message: spec.emptyMessage,
              ),
            ),
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
    required this.emptyMessage,
  });

  final ProfileContentTab tab;
  final String label;
  final IconData icon;
  final String emptyMessage;
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
    final fg = selected ? Colors.white : context.appColors.foreground;
    final iconColor = selected ? Colors.white : context.appColors.primary;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
              decoration: BoxDecoration(
                color: selected ? context.appColors.primary : Colors.transparent,
                border: selected
                    ? Border.all(color: context.appColors.primary, width: 2)
                    : null,
                boxShadow: selected
                    ? [
                        BoxShadow(
                          color: context.appColors.shadow,
                          offset: Offset(2, 2),
                          blurRadius: 0,
                        ),
                      ]
                    : null,
              ),
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
              color: selected ? context.appColors.primary : Colors.transparent,
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileTabPanel extends StatelessWidget {
  const _ProfileTabPanel({
    required this.icon,
    required this.message,
  });

  final IconData icon;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 28, color: context.appColors.primary.withValues(alpha: 0.85)),
          const SizedBox(height: 12),
          Text(
            message.toUpperCase(),
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.6,
              color: context.appColors.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}
