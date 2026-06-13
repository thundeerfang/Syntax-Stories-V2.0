import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/search_hit.dart';
import '../utils/search_query.dart';
import 'api_errors.dart';

class SearchApi {
  SearchApi({String? baseUrl}) : _baseUrlOverride = baseUrl;

  final String? _baseUrlOverride;

  String get baseUrl => _baseUrlOverride ?? resolveApiBaseUrl();

  Uri _u(String path, Map<String, String> params) {
    return Uri.parse('$baseUrl$path').replace(queryParameters: params);
  }

  /// Unified search — same backend as webapp, excluding `features`.
  Future<UnifiedSearchResult> unified(
    String query, {
    int limit = searchDefaultLimit,
  }) async {
    final q = normalizeSearchQuery(query);
    if (q.isEmpty) {
      return UnifiedSearchResult(q: q, minChars: searchMinChars, groups: {});
    }

    final types = mobileSearchTypes.map((t) => t.name).join(',');
    final uri = _u('/api/search', {
      'q': q,
      'types': types,
      'limit': '${limit.clamp(1, 10)}',
    });

    try {
      final res = await http.get(uri, headers: {'Accept': 'application/json'});
      final body = res.body;
      if (res.statusCode < 200 || res.statusCode >= 300) {
        logApiError(
          'Search HTTP error',
          method: 'GET',
          url: uri,
          statusCode: res.statusCode,
          responseBody: body,
        );
        return UnifiedSearchResult(q: q, minChars: searchMinChars, groups: {});
      }
      if (body.isEmpty) {
        return UnifiedSearchResult(q: q, minChars: searchMinChars, groups: {});
      }

      final data = jsonDecode(body) as Map<String, dynamic>;
      if (data['success'] != true) {
        return UnifiedSearchResult(q: q, minChars: searchMinChars, groups: {});
      }

      final rawGroups = data['groups'];
      final groups = <SearchGroupKey, List<SearchHit>>{};
      if (rawGroups is Map) {
        for (final key in mobileSearchTypes) {
          final list = rawGroups[key.name];
          if (list is! List || list.isEmpty) continue;
          groups[key] = list
              .whereType<Map>()
              .map((e) => SearchHit.fromJson(Map<String, dynamic>.from(e)))
              .toList();
        }
      }

      return UnifiedSearchResult(
        q: data['q']?.toString() ?? q,
        minChars: (data['minChars'] as num?)?.toInt() ?? searchMinChars,
        groups: groups,
        tookMs: (data['tookMs'] as num?)?.toInt(),
        cached: data['cached'] == true,
      );
    } catch (e) {
      logApiError('Search network error', method: 'GET', url: uri, cause: e);
      return UnifiedSearchResult(q: q, minChars: searchMinChars, groups: {});
    }
  }
}
