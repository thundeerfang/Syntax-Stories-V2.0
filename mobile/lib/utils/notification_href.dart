import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/web_config.dart';

IconData notificationIconData(String icon) {
  return switch (icon) {
    'repeat' => Icons.repeat_rounded,
    'eye' => Icons.visibility_outlined,
    'heart' => Icons.favorite_border_rounded,
    'tag' => Icons.sell_outlined,
    'users' => Icons.groups_outlined,
    'trending' => Icons.trending_up_rounded,
    'user-plus' => Icons.person_add_alt_1_outlined,
    'settings' => Icons.settings_outlined,
    'mail' => Icons.mail_outline_rounded,
    'award' => Icons.emoji_events_outlined,
    _ => Icons.notifications_none_rounded,
  };
}

/// Opens a notification href — native routes when possible, otherwise the webapp.
Future<void> openNotificationHref(BuildContext context, String href) async {
  final trimmed = href.trim();
  if (trimmed.isEmpty) return;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    await _launchExternal(trimmed);
    return;
  }

  final path = trimmed.startsWith('/') ? trimmed : '/$trimmed';

  if (path.startsWith('/settings')) {
    Navigator.of(context).popUntil((route) => route.isFirst);
    return;
  }

  final webUrl = '${resolveWebBaseUrl()}$path';
  await _launchExternal(webUrl);
}

Future<void> _launchExternal(String url) async {
  final uri = Uri.tryParse(url);
  if (uri == null) return;
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}
