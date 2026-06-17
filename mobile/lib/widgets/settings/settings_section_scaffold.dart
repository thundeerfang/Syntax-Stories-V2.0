import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import '../navigation/screen_app_bar.dart';
import '../ui/app_pull_to_refresh.dart';

/// Shared settings detail scaffold — title, description, body.
class SettingsSectionScaffold extends StatelessWidget {
  const SettingsSectionScaffold({
    super.key,
    required this.title,
    required this.description,
    required this.icon,
    required this.body,
    this.actions,
    this.iconOnPrimary = false,
    this.headerStyle = SettingsSectionHeaderStyle.cardRow,
    this.showHeaderTitle = true,
    this.onRefresh,
  });

  final String title;
  final String description;
  final IconData icon;
  final Widget body;
  final List<Widget>? actions;
  final bool iconOnPrimary;
  final SettingsSectionHeaderStyle headerStyle;
  final bool showHeaderTitle;
  final Future<void> Function()? onRefresh;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.appColors.background,
      appBar: ScreenAppBar(title: title, actions: actions),
      body: _buildBody(context),
    );
  }

  Widget _buildBody(BuildContext context) {
    final list = ListView(
      physics: AppPullToRefresh.scrollPhysics,
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      children: [
        _SettingsSectionHeader(
          icon: icon,
          title: title,
          description: description,
          iconOnPrimary: iconOnPrimary,
          style: headerStyle,
          showTitle: showHeaderTitle,
        ),
        const SizedBox(height: 20),
        body,
      ],
    );

    if (onRefresh == null) return list;
    return AppPullToRefresh(onRefresh: onRefresh!, child: list);
  }
}

enum SettingsSectionHeaderStyle { cardRow, centeredPlain }

class _SettingsSectionHeader extends StatelessWidget {
  const _SettingsSectionHeader({
    required this.icon,
    required this.title,
    required this.description,
    this.iconOnPrimary = false,
    this.style = SettingsSectionHeaderStyle.cardRow,
    this.showTitle = true,
  });

  final IconData icon;
  final String title;
  final String description;
  final bool iconOnPrimary;
  final SettingsSectionHeaderStyle style;
  final bool showTitle;

  @override
  Widget build(BuildContext context) {
    if (style == SettingsSectionHeaderStyle.centeredPlain) {
      return SettingsPlainHeader(
        icon: icon,
        title: showTitle ? title : null,
        description: description,
        iconOnPrimary: iconOnPrimary,
      );
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.appColors.card,
        border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
        boxShadow: [
          BoxShadow(color: context.appColors.shadow, offset: Offset(2, 2), blurRadius: 0),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: iconOnPrimary
                  ? context.appColors.primary
                  : context.appColors.muted.withValues(alpha: 0.35),
              border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
            ),
            child: Icon(
              icon,
              size: 20,
              color: iconOnPrimary ? Colors.white : context.appColors.primary,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (showTitle) ...[
                  Text(
                    title.toUpperCase(),
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.8,
                      color: context.appColors.foreground,
                    ),
                  ),
                  const SizedBox(height: 4),
                ],
                Text(
                  description,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    height: 1.4,
                    color: context.appColors.mutedForeground,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Centered icon square + optional title + description — My Setup section style.
class SettingsPlainHeader extends StatelessWidget {
  const SettingsPlainHeader({
    super.key,
    required this.icon,
    required this.description,
    this.title,
    this.iconOnPrimary = true,
  });

  final IconData icon;
  final String? title;
  final String description;
  final bool iconOnPrimary;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: iconOnPrimary
                  ? context.appColors.primary
                  : context.appColors.muted.withValues(alpha: 0.35),
              border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
            ),
            child: Icon(
              icon,
              size: 24,
              color: iconOnPrimary ? Colors.white : context.appColors.primary,
            ),
          ),
          if (title != null && title!.trim().isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              title!.toUpperCase(),
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.8,
                color: context.appColors.foreground,
              ),
            ),
          ],
          const SizedBox(height: 12),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 300),
            child: Text(
              description,
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 12.5,
                height: 1.5,
                color: context.appColors.mutedForeground,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class SettingsComingSoonPanel extends StatelessWidget {
  const SettingsComingSoonPanel({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      decoration: BoxDecoration(
        color: context.appColors.muted.withValues(alpha: 0.08),
        border: Border.all(
          color: context.appColors.border.withValues(alpha: 0.45),
          width: 2,
        ),
      ),
      child: Column(
        children: [
          Text(
            'STATUS',
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.6,
              color: context.appColors.mutedForeground,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Coming soon on mobile.',
            style: GoogleFonts.inter(fontSize: 14, color: context.appColors.mutedForeground),
          ),
        ],
      ),
    );
  }
}
