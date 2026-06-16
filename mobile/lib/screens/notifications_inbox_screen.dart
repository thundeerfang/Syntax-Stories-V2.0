import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../models/app_notification.dart';
import '../screens/settings/notifications_screen.dart';
import '../state/auth_state.dart';
import '../state/notification_state.dart';
import '../theme/app_color_tokens.dart';
import '../utils/notification_href.dart';
import '../widgets/notifications/notification_inbox_skeleton.dart';
import '../widgets/navigation/screen_app_bar.dart';
import '../widgets/ui/app_pull_to_refresh.dart';

/// Full-screen notifications inbox — replaces the old bottom sheet.
class NotificationsInboxScreen extends StatefulWidget {
  const NotificationsInboxScreen({super.key});

  static void open(BuildContext context) {
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => const NotificationsInboxScreen()),
    );
  }

  @override
  State<NotificationsInboxScreen> createState() => _NotificationsInboxScreenState();
}

class _NotificationsInboxScreenState extends State<NotificationsInboxScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) return;
    await context.read<NotificationState>().loadList(token);
  }

  Future<void> _onRefresh() => _load();

  void _openPreferences() {
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => const NotificationsScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final auth = context.watch<AuthState>();
    final notif = context.watch<NotificationState>();
    final token = auth.accessToken;

    return Scaffold(
      backgroundColor: colors.background,
      appBar: ScreenAppBar(
        title: 'Notifications',
        actions: [
          if (token != null && notif.unreadCount > 0)
            IconButton(
              tooltip: 'Mark all read',
              onPressed: notif.markingAllRead ? null : () => notif.markAllRead(token),
              icon: notif.markingAllRead
                  ? SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: primary),
                    )
                  : Icon(Icons.done_all_rounded, color: primary, size: 22),
            ),
          IconButton(
            tooltip: 'Notification preferences',
            onPressed: _openPreferences,
            icon: Icon(Icons.settings_outlined, color: colors.mutedForeground, size: 22),
          ),
        ],
      ),
      body: AppPullToRefresh(
        onRefresh: _onRefresh,
        child: _buildBody(context, token: token, notif: notif),
      ),
    );
  }

  Widget _buildBody(
    BuildContext context, {
    required String? token,
    required NotificationState notif,
  }) {
    final colors = context.appColors;

    if (token == null || token.isEmpty) {
      return ListView(
        physics: AppPullToRefresh.scrollPhysics,
        children: [
          Padding(
            padding: const EdgeInsets.all(32),
            child: Text(
              'Sign in to see notifications.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(color: colors.mutedForeground),
            ),
          ),
        ],
      );
    }

    if (notif.loadingList && notif.items.isEmpty) {
      return NotificationInboxSkeleton(physics: AppPullToRefresh.scrollPhysics);
    }

    if (notif.items.isEmpty) {
      return ListView(
        physics: AppPullToRefresh.scrollPhysics,
        children: [
          Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    border: Border.all(color: colors.border, width: 2),
                    color: colors.muted.withValues(alpha: 0.2),
                  ),
                  child: Icon(Icons.notifications_none_rounded, color: colors.mutedForeground),
                ),
                const SizedBox(height: 12),
                Text(
                  "You're all caught up",
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: colors.foreground,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Milestones, follows, trending, and settings updates will appear here.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(fontSize: 12, color: colors.mutedForeground),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.separated(
      physics: AppPullToRefresh.scrollPhysics,
      itemCount: notif.items.length,
      separatorBuilder: (_, _) => Divider(height: 1, color: colors.border.withValues(alpha: 0.7)),
      itemBuilder: (context, index) {
        final item = notif.items[index];
        return _NotificationRow(
          item: item,
          onTap: () async {
            if (item.unread) {
              await notif.markRead(token, item);
            }
            if (!context.mounted) return;
            await openNotificationHref(context, item.href);
          },
        );
      },
    );
  }
}

class _NotificationRow extends StatelessWidget {
  const _NotificationRow({required this.item, required this.onTap});

  final AppNotification item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final icon = notificationIconData(item.icon);
    final typeLabel = notificationTypeLabel(item.type);

    return Material(
      color: item.unread ? primary.withValues(alpha: 0.06) : Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  border: Border.all(color: colors.border, width: 2),
                  color: item.unread
                      ? primary.withValues(alpha: 0.14)
                      : colors.muted.withValues(alpha: 0.25),
                ),
                child: Icon(
                  icon,
                  size: 18,
                  color: item.unread ? primary : colors.mutedForeground,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          typeLabel.toUpperCase(),
                          style: GoogleFonts.inter(
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1,
                            color: primary.withValues(alpha: 0.85),
                          ),
                        ),
                        if (item.unread) ...[
                          const SizedBox(width: 6),
                          Container(width: 6, height: 6, color: primary),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: colors.foreground,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item.message,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: colors.mutedForeground,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.time.toUpperCase(),
                      style: GoogleFonts.inter(
                        fontSize: 9,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.8,
                        color: colors.mutedForeground.withValues(alpha: 0.85),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
