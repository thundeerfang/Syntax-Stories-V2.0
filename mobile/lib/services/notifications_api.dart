import 'dart:convert';

import '../config/api_config.dart';
import '../models/notification_preferences.dart';
import 'api_errors.dart';
import 'auth_api.dart';
import 'auth_retry.dart';

class NotificationsApi {
  NotificationsApi({String? baseUrl}) : _baseUrlOverride = baseUrl;

  final String? _baseUrlOverride;

  String get baseUrl => _baseUrlOverride ?? resolveApiBaseUrl();

  Uri _u(String path) => Uri.parse('$baseUrl$path');

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
}
