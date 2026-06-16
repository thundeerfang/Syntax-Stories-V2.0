import 'dart:async';

import 'package:flutter/foundation.dart';

import '../models/app_notification.dart';
import '../services/notification_stream.dart';
import '../services/notifications_api.dart';

class NotificationState extends ChangeNotifier {
  NotificationState({
    NotificationsApi? api,
    NotificationStreamClient? streamClient,
  })  : _api = api ?? NotificationsApi(),
        _streamClient = streamClient ?? NotificationStreamClient();

  final NotificationsApi _api;
  final NotificationStreamClient _streamClient;

  int unreadCount = 0;
  List<AppNotification> items = const [];
  bool loadingList = false;
  bool markingAllRead = false;
  int _bumpVersion = 0;

  String? _activeToken;
  bool _streamCancelled = false;

  int get bumpVersion => _bumpVersion;

  void bindAccessToken(String? token) {
    if (_activeToken == token) return;
    _activeToken = token;
    _stopStream();
    if (token == null || token.isEmpty) {
      unreadCount = 0;
      items = const [];
      notifyListeners();
      return;
    }
    _streamCancelled = false;
    _startStream(token);
    unawaited(refreshUnread(token));
  }

  void _startStream(String token) {
    unawaited(
      _streamClient.consume(
        accessToken: token,
        isCancelled: () => _streamCancelled || _activeToken != token,
        onEvent: (event) {
          if (_activeToken != token) return;
          if (event.type == 'snapshot' && event.unreadCount != null) {
            unreadCount = event.unreadCount!;
            notifyListeners();
            return;
          }
          if (event.type == 'notification' && event.notification != null) {
            pushNotification(event.notification!);
          }
        },
      ),
    );
  }

  void _stopStream() {
    _streamCancelled = true;
  }

  void pushNotification(AppNotification notification) {
    items = [
      notification,
      ...items.where((row) => row.id != notification.id),
    ];
    if (notification.unread) {
      unreadCount += 1;
    }
    _bumpVersion += 1;
    notifyListeners();
  }

  Future<void> refreshUnread(String token) async {
    try {
      final result = await _api.fetchNotifications(token, limit: 1);
      unreadCount = result.unreadCount;
      notifyListeners();
    } catch (_) {}
  }

  Future<void> loadList(String token) async {
    loadingList = true;
    notifyListeners();
    try {
      final result = await _api.fetchNotifications(token);
      items = result.notifications;
      unreadCount = result.unreadCount;
    } catch (_) {
      items = const [];
    } finally {
      loadingList = false;
      notifyListeners();
    }
  }

  Future<void> markAllRead(String token) async {
    if (unreadCount == 0 || markingAllRead) return;
    markingAllRead = true;
    notifyListeners();
    try {
      await _api.markAllRead(token);
      items = items.map((n) => n.copyWith(unread: false)).toList();
      unreadCount = 0;
    } finally {
      markingAllRead = false;
      notifyListeners();
    }
  }

  Future<void> markRead(String token, AppNotification notification) async {
    if (!notification.unread) return;
    try {
      await _api.markRead(token, notification.id);
      items = items
          .map((row) => row.id == notification.id ? row.copyWith(unread: false) : row)
          .toList();
      unreadCount = unreadCount > 0 ? unreadCount - 1 : 0;
      notifyListeners();
    } catch (_) {}
  }

  @override
  void dispose() {
    _stopStream();
    super.dispose();
  }
}
