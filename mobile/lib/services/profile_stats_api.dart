import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/profile_stats.dart';
import 'api_errors.dart';

class ProfileStatsApi {
  ProfileStatsApi({String? baseUrl}) : _baseUrlOverride = baseUrl;

  final String? _baseUrlOverride;

  String get baseUrl => _baseUrlOverride ?? resolveApiBaseUrl();

  Uri _u(String path) => Uri.parse('$baseUrl$path');

  Future<ProfileStats> fetchForUsername(String username) async {
    final slug = username.trim().toLowerCase();
    if (slug.isEmpty) return ProfileStats.zero;

    final uri = _u('/api/follow/profile/${Uri.encodeComponent(slug)}');
    try {
      final res = await http.get(uri, headers: {'Accept': 'application/json'});
      final body = res.body;
      if (res.statusCode < 200 || res.statusCode >= 300) {
        logApiError(
          'Profile stats HTTP error',
          method: 'GET',
          url: uri,
          statusCode: res.statusCode,
          responseBody: body,
        );
        return ProfileStats.zero;
      }
      if (body.isEmpty) return ProfileStats.zero;
      final data = jsonDecode(body) as Map<String, dynamic>;
      if (data['success'] != true) return ProfileStats.zero;
      return ProfileStats.fromJson(data);
    } catch (e) {
      logApiError('Profile stats network error', method: 'GET', url: uri, cause: e);
      return ProfileStats.zero;
    }
  }
}
