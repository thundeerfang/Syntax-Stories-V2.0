import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/blog_post.dart';
import '../models/blog_taxonomy.dart';
import 'api_errors.dart';
import 'auth_api.dart';
import 'auth_retry.dart';

class BlogApi {
  BlogApi({String? baseUrl}) : _baseUrlOverride = baseUrl;

  final String? _baseUrlOverride;

  String get baseUrl => _baseUrlOverride ?? resolveApiBaseUrl();

  Uri _u(String path) => Uri.parse('$baseUrl$path');

  /// `GET /api/blog/taxonomy` — public categories and suggested tags.
  Future<BlogTaxonomyCatalog> fetchTaxonomy() async {
    final uri = _u('/api/blog/taxonomy');
    try {
      final res = await http.get(uri, headers: {'Accept': 'application/json'});
      final text = res.body;
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
          context: 'Invalid taxonomy response',
          debugDetails: text,
        );
      }
      return BlogTaxonomyCatalog.fromJson(data);
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'GET', url: uri, cause: e);
    }
  }

  /// `POST /api/blog` — create draft or published post.
  Future<BlogPost> createPost({
    required String accessToken,
    required String title,
    required String content,
    String? summary,
    String? thumbnailUrl,
    required String status,
    String? category,
    List<String>? tags,
    String language = 'en',
  }) async {
    final uri = _u('/api/blog');
    final body = <String, dynamic>{
      'title': title.trim(),
      'content': content,
      'status': status,
      'language': language,
      if (summary != null && summary.trim().isNotEmpty) 'summary': summary.trim(),
      if (thumbnailUrl != null && thumbnailUrl.trim().isNotEmpty)
        'thumbnailUrl': thumbnailUrl.trim(),
      if (category != null && category.trim().isNotEmpty) 'category': category.trim(),
      if (tags != null && tags.isNotEmpty) 'tags': tags,
    };

    try {
      final res = await AuthRetry.post(
        uri,
        bearer: accessToken,
        body: jsonEncode(body),
      );
      return _parsePostResponse(res, uri, method: 'POST');
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'POST', url: uri, cause: e);
    }
  }

  /// `PUT /api/blog/draft` — upsert the user's single server draft.
  Future<BlogPost> saveDraft({
    required String accessToken,
    required String title,
    required String content,
    String? summary,
    String? thumbnailUrl,
    String? category,
    List<String>? tags,
    String language = 'en',
  }) async {
    final uri = _u('/api/blog/draft');
    final body = <String, dynamic>{
      'title': title.trim(),
      'content': content,
      'language': language,
      if (summary != null && summary.trim().isNotEmpty) 'summary': summary.trim(),
      if (thumbnailUrl != null && thumbnailUrl.trim().isNotEmpty)
        'thumbnailUrl': thumbnailUrl.trim(),
      if (category != null && category.trim().isNotEmpty) 'category': category.trim(),
      if (tags != null && tags.isNotEmpty) 'tags': tags,
    };

    try {
      final res = await AuthRetry.put(
        uri,
        bearer: accessToken,
        body: jsonEncode(body),
      );
      return _parsePostResponse(res, uri, method: 'PUT');
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'PUT', url: uri, cause: e);
    }
  }

  BlogPost _parsePostResponse(http.Response res, Uri uri, {required String method}) {
    final text = res.body;
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
        context: 'Blog API failed',
        debugDetails: text,
        userMessage: parseServerMessage(text),
      );
    }
    final post = data['post'];
    if (post is! Map<String, dynamic>) {
      throw AuthApiException.internal(
        context: 'Missing blog post in response',
        debugDetails: text,
      );
    }
    return BlogPost.fromJson(post);
  }
}
