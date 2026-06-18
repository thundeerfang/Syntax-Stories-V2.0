import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'api_errors.dart';

/// Polls `GET /api/health` until the backend responds (Render free tier cold start).
class ServerConnectApi {
  ServerConnectApi({String? baseUrl}) : _baseUrlOverride = baseUrl;

  final String? _baseUrlOverride;

  String get baseUrl => _baseUrlOverride ?? resolveApiBaseUrl();

  Uri get healthUri => Uri.parse('$baseUrl/api/health');

  /// Returns `true` when the server responds with `{ success: true }`.
  Future<bool> ping({Duration timeout = const Duration(seconds: 20)}) async {
    try {
      final res = await http.get(healthUri).timeout(timeout);
      if (res.statusCode < 200 || res.statusCode >= 300) return false;
      final data = jsonDecode(res.body);
      if (data is! Map<String, dynamic>) return false;
      return data['success'] == true;
    } catch (e) {
      logApiInfo('Server health ping failed (${healthUri.host}): $e');
      return false;
    }
  }

  /// Retry until ready or [maxAttempts] exhausted.
  Future<bool> waitUntilReady({
    required int maxAttempts,
    Duration interval = const Duration(seconds: 2),
    void Function(int attempt, int maxAttempts)? onAttempt,
  }) async {
    logApiInfo('Connecting to API at $baseUrl (max $maxAttempts attempts)');
    for (var attempt = 1; attempt <= maxAttempts; attempt++) {
      onAttempt?.call(attempt, maxAttempts);
      if (await ping()) {
        logApiInfo('API ready at $baseUrl');
        return true;
      }
      if (attempt < maxAttempts) {
        await Future<void>.delayed(interval);
      }
    }
    return false;
  }
}
