import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/app_notification.dart';

typedef NotificationStreamEvent = ({
  String type,
  List<AppNotification>? notifications,
  int? unreadCount,
  AppNotification? notification,
});

/// SSE consumer for `GET /api/notifications/stream`.
class NotificationStreamClient {
  NotificationStreamClient({String? baseUrl}) : _baseUrl = baseUrl ?? resolveApiBaseUrl();

  final String _baseUrl;

  Future<void> consume({
    required String accessToken,
    required void Function(NotificationStreamEvent event) onEvent,
    required bool Function() isCancelled,
    Duration retryDelay = const Duration(seconds: 8),
  }) async {
    while (!isCancelled()) {
      try {
        await _connect(accessToken: accessToken, onEvent: onEvent, isCancelled: isCancelled);
      } catch (_) {
        if (isCancelled()) return;
        await Future<void>.delayed(retryDelay);
      }
    }
  }

  Future<void> _connect({
    required String accessToken,
    required void Function(NotificationStreamEvent event) onEvent,
    required bool Function() isCancelled,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/notifications/stream');
    final client = http.Client();
    try {
      final request = http.Request('GET', uri);
      request.headers['Authorization'] = 'Bearer $accessToken';
      request.headers['Accept'] = 'text/event-stream';

      final response = await client.send(request);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw HttpException('Notification stream failed (${response.statusCode})');
      }

      var buffer = '';
      await for (final chunk in response.stream.transform(utf8.decoder)) {
        if (isCancelled()) return;
        buffer += chunk;
        final parts = buffer.split('\n\n');
        buffer = parts.isEmpty ? '' : parts.removeLast();
        for (final part in parts) {
          _parsePart(part, onEvent);
        }
      }
    } finally {
      client.close();
    }
  }

  void _parsePart(String part, void Function(NotificationStreamEvent event) onEvent) {
    for (final line in part.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      final raw = line.substring(6).trim();
      if (raw.isEmpty) continue;
      try {
        final json = jsonDecode(raw) as Map<String, dynamic>;
        final type = json['type']?.toString() ?? '';
        if (type == 'snapshot') {
          final rows = json['notifications'];
          final notifications = rows is List
              ? rows
                  .whereType<Map<String, dynamic>>()
                  .map(AppNotification.fromJson)
                  .toList()
              : <AppNotification>[];
          final unread = json['unreadCount'];
          onEvent((
            type: type,
            notifications: notifications,
            unreadCount: unread is num ? unread.toInt() : null,
            notification: null,
          ));
          continue;
        }
        if (type == 'notification') {
          final payload = json['payload'];
          if (payload is Map<String, dynamic>) {
            final notifJson = payload['notification'];
            if (notifJson is Map<String, dynamic>) {
              onEvent((
                type: type,
                notifications: null,
                unreadCount: null,
                notification: AppNotification.fromJson(notifJson),
              ));
            }
          }
        }
      } catch (_) {}
    }
  }
}
