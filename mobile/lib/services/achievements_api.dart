import 'dart:convert';

import '../config/api_config.dart';
import '../models/achievement_item.dart';
import 'api_errors.dart';
import 'auth_api.dart';
import 'auth_retry.dart';

class AchievementsApi {
  AchievementsApi({String? baseUrl}) : _baseUrlOverride = baseUrl;

  final String? _baseUrlOverride;

  String get baseUrl => _baseUrlOverride ?? resolveApiBaseUrl();

  Uri _u(String path) => Uri.parse('$baseUrl$path');

  /// `GET /api/achievements` — mirrors webapp `achievementsApi.list`.
  Future<AchievementsListResponse> list({required String accessToken}) async {
    final uri = _u('/api/achievements');
    final res = await AuthRetry.get(uri, bearer: accessToken);
    final text = res.body;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw AuthApiException.fromHttp(
        method: 'GET',
        url: uri,
        statusCode: res.statusCode,
        body: text,
      );
    }
    if (text.isEmpty) {
      throw AuthApiException.internal(
        context: 'Empty achievements response',
        debugDetails: 'empty body',
        userMessage: 'Could not load achievements.',
      );
    }
    final data = jsonDecode(text) as Map<String, dynamic>;
    if (data['success'] != true) {
      throw AuthApiException.internal(
        context: 'Invalid achievements response',
        debugDetails: text,
        userMessage: parseServerMessage(text),
      );
    }
    return AchievementsListResponse.fromJson(data);
  }
}
