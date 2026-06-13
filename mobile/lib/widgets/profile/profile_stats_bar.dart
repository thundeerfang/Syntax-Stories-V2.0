import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/follow_user.dart';
import '../../models/profile_stats.dart';
import '../../screens/follow_list_screen.dart';
import '../../services/profile_stats_api.dart';
import '../../theme/app_color_tokens.dart';
import '../ui/dashed_border_box.dart';
import 'profile_respect_lottie.dart';
import 'profile_streak_lottie.dart';

/// Webapp profile stats row — Respect, Read streak, Followers, Following.
class ProfileStatsBar extends StatefulWidget {
  const ProfileStatsBar({
    super.key,
    this.username,
    this.horizontalPadding = 20,
  });

  final String? username;
  final double horizontalPadding;

  @override
  State<ProfileStatsBar> createState() => _ProfileStatsBarState();
}

class _ProfileStatsBarState extends State<ProfileStatsBar> {
  final _api = ProfileStatsApi();
  ProfileStats _stats = ProfileStats.zero;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  @override
  void didUpdateWidget(covariant ProfileStatsBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.username != widget.username) {
      _loadStats();
    }
  }

  void _openFollowList(
    BuildContext context,
    String username,
    FollowListKind kind,
    int count,
  ) {
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => FollowListScreen(
          username: username,
          kind: kind,
          totalCount: count,
        ),
      ),
    );
  }

  Future<void> _loadStats() async {
    final username = widget.username?.trim();
    if (username == null || username.isEmpty) {
      if (mounted) setState(() => _stats = ProfileStats.zero);
      return;
    }
    final stats = await _api.fetchForUsername(username);
    if (mounted) setState(() => _stats = stats);
  }

  @override
  Widget build(BuildContext context) {
    final username = widget.username?.trim();
    final isLight = Theme.of(context).brightness == Brightness.light;
    final borderColor = context.appColors.border.withValues(
      alpha: isLight ? 0.22 : 0.32,
    );

    return Padding(
      padding: EdgeInsets.fromLTRB(widget.horizontalPadding, 0, widget.horizontalPadding, 16),
      child: DashedBorderBox(
        color: borderColor,
        strokeWidth: 2,
        dashLength: 14,
        dashGap: 8,
        backgroundColor: context.appColors.muted.withValues(alpha: 0.08),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Wrap(
          spacing: 20,
          runSpacing: 12,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            _StatItem(
              icon: const ProfileRespectLottie(),
              value: _stats.respect,
              label: 'Respect',
            ),
            _StatItem(
              icon: const ProfileStreakLottie(),
              value: _stats.readStreak,
              label: 'Read streak',
            ),
            _StatItem(
              icon: Icon(Icons.people_outline, size: 18, color: context.appColors.primary),
              value: _stats.followers,
              label: 'Followers',
              onTap: username != null && username.isNotEmpty
                  ? () => _openFollowList(context, username, FollowListKind.followers, _stats.followers)
                  : null,
            ),
            _StatItem(
              icon: Icon(Icons.people_outline, size: 18, color: context.appColors.primary),
              value: _stats.following,
              label: 'Following',
              onTap: username != null && username.isNotEmpty
                  ? () => _openFollowList(context, username, FollowListKind.following, _stats.following)
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.icon,
    required this.value,
    required this.label,
    this.onTap,
  });

  final Widget icon;
  final int value;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final content = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        icon,
        const SizedBox(width: 8),
        Text(
          '$value',
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.4,
            color: context.appColors.foreground,
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 9,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.4,
            color: onTap != null ? context.appColors.primary : context.appColors.mutedForeground,
          ),
        ),
      ],
    );

    if (onTap == null) return content;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(4),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
          child: content,
        ),
      ),
    );
  }
}
