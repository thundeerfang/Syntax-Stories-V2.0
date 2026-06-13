import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/read_streak_payload.dart';
import 'api_errors.dart';

class ReadStreakApi {
  ReadStreakApi({String? baseUrl}) : _baseUrlOverride = baseUrl;

  final String? _baseUrlOverride;

  String get baseUrl => _baseUrlOverride ?? resolveApiBaseUrl();

  Uri _u(String path) => Uri.parse('$baseUrl$path');

  /// `GET /api/follow/profile/:username` — same payload as web settings streak panel.
  Future<ReadStreakPayload?> fetchForUsername(String username) async {
    final slug = username.trim().toLowerCase();
    if (slug.isEmpty) return null;

    final uri = _u('/api/follow/profile/${Uri.encodeComponent(slug)}');
    try {
      final res = await http.get(uri, headers: {'Accept': 'application/json'});
      final body = res.body;
      if (res.statusCode < 200 || res.statusCode >= 300) {
        logApiError(
          'Read streak HTTP error',
          method: 'GET',
          url: uri,
          statusCode: res.statusCode,
          responseBody: body,
        );
        return null;
      }
      if (body.isEmpty) return null;
      final data = jsonDecode(body) as Map<String, dynamic>;
      if (data['success'] != true) return null;
      return ReadStreakPayload.fromJson(data['readStreak']);
    } catch (e) {
      logApiError('Read streak network error', method: 'GET', url: uri, cause: e);
      return null;
    }
  }
}
