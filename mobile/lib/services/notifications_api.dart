import 'dart:async';
import 'dart:convert';

import '../config/api_config.dart';
import '../models/app_notification.dart';
import '../models/notification_preferences.dart';
import 'api_errors.dart';
import 'auth_api.dart';
import 'auth_retry.dart';

class NotificationsListResult {
  const NotificationsListResult({
    required this.notifications,
    required this.unreadCount,
  });

  final List<AppNotification> notifications;
  final int unreadCount;
}

class NotificationsApi {
  NotificationsApi({String? baseUrl}) : _baseUrlOverride = baseUrl;

  final String? _baseUrlOverride;

  String get baseUrl => _baseUrlOverride ?? resolveApiBaseUrl();

  Uri _u(String path) => Uri.parse('$baseUrl$path');

  /// `GET /api/notifications`
  Future<NotificationsListResult> fetchNotifications(
    String accessToken, {
    int limit = 50,
  }) async {
    final uri = _u('/api/notifications').replace(queryParameters: {
      'limit': '$limit',
    });
    try {
      final res = await AuthRetry.get(uri, bearer: accessToken);
      return _parseListResponse(res, uri);
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'GET', url: uri, cause: e);
    }
  }

  /// `POST /api/notifications/read-all`
  Future<void> markAllRead(String accessToken) async {
    final uri = _u('/api/notifications/read-all');
    try {
      final res = await AuthRetry.post(uri, bearer: accessToken);
      _ensureSuccess(res, uri, method: 'POST');
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'POST', url: uri, cause: e);
    }
  }

  /// `POST /api/notifications/:id/read`
  Future<void> markRead(String accessToken, String notificationId) async {
    final uri = _u('/api/notifications/${Uri.encodeComponent(notificationId)}/read');
    try {
      final res = await AuthRetry.post(uri, bearer: accessToken);
      _ensureSuccess(res, uri, method: 'POST');
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'POST', url: uri, cause: e);
    }
  }

  /// `POST /api/notifications/device-tokens`
  Future<void> registerDeviceToken(
    String accessToken, {
    required String token,
    required String platform,
  }) async {
    final uri = _u('/api/notifications/device-tokens');
    try {
      final res = await AuthRetry.post(
        uri,
        bearer: accessToken,
        body: jsonEncode({'token': token, 'platform': platform}),
      );
      _ensureSuccess(res, uri, method: 'POST');
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'POST', url: uri, cause: e);
    }
  }

  /// `DELETE /api/notifications/device-tokens`
  Future<void> unregisterDeviceToken(
    String accessToken, {
    required String token,
  }) async {
    final uri = _u('/api/notifications/device-tokens');
    try {
      final res = await AuthRetry.delete(
        uri,
        bearer: accessToken,
        body: jsonEncode({'token': token}),
      );
      _ensureSuccess(res, uri, method: 'DELETE');
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'DELETE', url: uri, cause: e);
    }
  }

  /// `GET /api/notifications/preferences`
  Future<NotificationPreferences> fetchPreferences(String accessToken) async {
    final uri = _u('/api/notifications/preferences');
    try {
      final res = await AuthRetry.get(uri, bearer: accessToken);
      return _parsePreferencesResponse(res, uri, method: 'GET');
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'GET', url: uri, cause: e);
    }
  }

  /// `PATCH /api/notifications/preferences`
  Future<NotificationPreferences> updatePreferences(
    String accessToken,
    Map<String, bool> patch,
  ) async {
    final uri = _u('/api/notifications/preferences');
    try {
      final res = await AuthRetry.patch(
        uri,
        bearer: accessToken,
        body: jsonEncode(patch),
      );
      return _parsePreferencesResponse(res, uri, method: 'PATCH');
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'PATCH', url: uri, cause: e);
    }
  }

  NotificationPreferences _parsePreferencesResponse(
    dynamic res,
    Uri uri, {
    required String method,
  }) {
    final text = res.body as String;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw AuthApiException.fromHttp(
        method: method,
        url: uri,
        statusCode: res.statusCode,
        body: text,
      );
    }
    final data = text.isEmpty ? <String, dynamic>{} : jsonDecode(text) as Map<String, dynamic>;
    if (data['success'] != true) {
      throw AuthApiException.internal(
        context: 'Invalid notification preferences response',
        debugDetails: text,
        userMessage: parseServerMessage(text),
      );
    }
    final prefs = data['preferences'];
    if (prefs is! Map<String, dynamic>) {
      throw AuthApiException.internal(
        context: 'Missing notification preferences payload',
        debugDetails: text,
      );
    }
    return NotificationPreferences.fromJson(prefs);
  }

  NotificationsListResult _parseListResponse(dynamic res, Uri uri) {
    final text = res.body as String;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw AuthApiException.fromHttp(
        method: 'GET',
        url: uri,
        statusCode: res.statusCode,
        body: text,
      );
    }
    final data = text.isEmpty ? <String, dynamic>{} : jsonDecode(text) as Map<String, dynamic>;
    if (data['success'] != true) {
      throw AuthApiException.internal(
        context: 'Invalid notifications list response',
        debugDetails: text,
        userMessage: parseServerMessage(text),
      );
    }
    final rows = data['notifications'];
    final notifications = rows is List
        ? rows.whereType<Map<String, dynamic>>().map(AppNotification.fromJson).toList()
        : <AppNotification>[];
    final unread = data['unreadCount'];
    return NotificationsListResult(
      notifications: notifications,
      unreadCount: unread is num ? unread.toInt() : notifications.where((n) => n.unread).length,
    );
  }

  void _ensureSuccess(dynamic res, Uri uri, {required String method}) {
    final text = res.body as String;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw AuthApiException.fromHttp(
        method: method,
        url: uri,
        statusCode: res.statusCode,
        body: text,
      );
    }
    if (text.isEmpty) return;
    final data = jsonDecode(text) as Map<String, dynamic>;
    if (data['success'] != true) {
      throw AuthApiException.internal(
        context: 'Invalid notification API response',
        debugDetails: text,
        userMessage: parseServerMessage(text),
      );
    }
  }
}
