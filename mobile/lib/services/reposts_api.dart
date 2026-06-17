import 'dart:convert';

import '../config/api_config.dart';
import '../models/blog_feed_post.dart';
import 'api_errors.dart';
import 'auth_api.dart';
import 'auth_retry.dart';

class RepostsApi {
  RepostsApi({String? baseUrl}) : _baseUrlOverride = baseUrl;

  final String? _baseUrlOverride;

  String get baseUrl => _baseUrlOverride ?? resolveApiBaseUrl();

  Uri _u(String path, [Map<String, String>? query]) {
    final uri = Uri.parse('$baseUrl$path');
    if (query == null || query.isEmpty) return uri;
    return uri.replace(queryParameters: query);
  }

  /// `GET /api/reposts/posts` — mirrors webapp `repostsApi.listRepostedPosts`.
  Future<List<BlogFeedPost>> listRepostedPosts({
    required String accessToken,
    String? query,
    int limit = 80,
    String sort = 'newest',
  }) async {
    final params = <String, String>{
      'limit': '$limit',
      if (query != null && query.trim().isNotEmpty) 'q': query.trim(),
      if (sort == 'oldest') 'sort': 'oldest',
    };
    final uri = _u('/api/reposts/posts', params);
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
    if (text.isEmpty) return const [];
    final data = jsonDecode(text) as Map<String, dynamic>;
    if (data['success'] != true) {
      throw AuthApiException.internal(
        context: 'Invalid reposts response',
        debugDetails: text,
        userMessage: parseServerMessage(text),
      );
    }
    final rows = data['posts'];
    if (rows is! List) return const [];
    return rows
        .whereType<Map<String, dynamic>>()
        .map(BlogFeedPost.fromJson)
        .toList();
  }
}
