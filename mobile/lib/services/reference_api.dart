import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/tech_stack_item.dart';
import 'api_errors.dart';

class ReferenceApi {
  ReferenceApi({String? baseUrl}) : _baseUrl = baseUrl ?? resolveApiBaseUrl();

  final String _baseUrl;

  Uri _u(String path, [Map<String, String>? query]) =>
      Uri.parse('$_baseUrl$path').replace(queryParameters: query);

  /// `GET /api/reference/tech-stack?q=…&limit=…`
  Future<List<TechStackItem>> searchTechStack(
    String query, {
    int limit = 12,
  }) async {
    final q = query.trim();
    if (q.length < 2) return [];

    final uri = _u('/api/reference/tech-stack', {
      'q': q,
      'limit': '$limit',
    });

    try {
      final res = await http.get(uri).timeout(const Duration(seconds: 8));
      if (res.statusCode < 200 || res.statusCode >= 300) {
        logApiError(
          'Tech stack search failed',
          method: 'GET',
          url: uri,
          statusCode: res.statusCode,
          responseBody: res.body,
        );
        return [];
      }

      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final items = data['items'];
      if (items is! List) {
        logApiError(
          'Tech stack search returned unexpected payload',
          method: 'GET',
          url: uri,
          responseBody: res.body,
        );
        return [];
      }

      final parsed = items
          .whereType<Map<String, dynamic>>()
          .map(TechStackItem.fromJson)
          .where((item) => item.name.isNotEmpty)
          .toList();

      logApiInfo('Tech stack search "$q" → ${parsed.length} result(s)');
      return parsed;
    } catch (e) {
      logApiError(
        'Tech stack search error',
        method: 'GET',
        url: uri,
        cause: e,
      );
      return [];
    }
  }

  /// `POST /api/reference/tech-stack/resolve` — enrich names with iconSlug + iconUrl.
  Future<List<TechStackItem>> resolveTechStack(List<String> names) async {
    final trimmed = names.map((n) => n.trim()).where((n) => n.isNotEmpty).take(10).toList();
    if (trimmed.isEmpty) return [];

    final uri = _u('/api/reference/tech-stack/resolve');

    try {
      final res = await http
          .post(
            uri,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'names': trimmed}),
          )
          .timeout(const Duration(seconds: 8));

      if (res.statusCode < 200 || res.statusCode >= 300) {
        logApiError(
          'Tech stack resolve failed',
          method: 'POST',
          url: uri,
          statusCode: res.statusCode,
          responseBody: res.body,
        );
        return [];
      }

      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final items = data['items'];
      if (items is! List) return [];

      return items
          .whereType<Map<String, dynamic>>()
          .map(TechStackItem.fromJson)
          .where((item) => item.name.isNotEmpty)
          .toList();
    } catch (e) {
      logApiError(
        'Tech stack resolve error',
        method: 'POST',
        url: uri,
        cause: e,
      );
      return [];
    }
  }
}
