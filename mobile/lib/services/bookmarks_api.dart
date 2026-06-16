import 'dart:convert';

import '../config/api_config.dart';
import '../models/blog_feed_post.dart';
import '../models/bookmark_group.dart';
import 'auth_api.dart';
import 'auth_retry.dart';

class BookmarksApi {
  BookmarksApi({String? baseUrl}) : _baseUrlOverride = baseUrl;

  final String? _baseUrlOverride;

  String get baseUrl => _baseUrlOverride ?? resolveApiBaseUrl();

  Uri _u(String path, [Map<String, String>? query]) {
    final uri = Uri.parse('$baseUrl$path');
    if (query == null || query.isEmpty) return uri;
    return uri.replace(queryParameters: query);
  }

  Future<List<BookmarkGroup>> listGroups({required String accessToken}) async {
    final uri = _u('/api/bookmarks/groups');
    final res = await AuthRetry.get(uri, bearer: accessToken);
    return _parseGroups(res, uri);
  }

  Future<BookmarkGroup> createGroup({
    required String accessToken,
    required String name,
    String? emoji,
    bool makeDefault = false,
  }) async {
    final uri = _u('/api/bookmarks/groups');
    final body = <String, dynamic>{
      'name': name.trim(),
      if (emoji != null && emoji.trim().isNotEmpty) 'emoji': emoji.trim(),
      if (makeDefault) 'makeDefault': true,
    };
    final res = await AuthRetry.post(uri, bearer: accessToken, body: body);
    final data = _parseJsonMap(res, uri);
    final group = data['group'];
    if (group is! Map<String, dynamic>) {
      throw AuthApiException.internal(
        context: 'Invalid bookmark group response',
        debugDetails: res.body,
      );
    }
    return BookmarkGroup.fromJson(group);
  }

  Future<BookmarkGroup> updateGroup({
    required String accessToken,
    required String groupId,
    String? name,
    String? emoji,
  }) async {
    final uri = _u('/api/bookmarks/groups/${Uri.encodeComponent(groupId)}');
    final body = <String, dynamic>{};
    if (name != null) body['name'] = name.trim();
    if (emoji != null) body['emoji'] = emoji.trim();
    final res = await AuthRetry.patch(uri, bearer: accessToken, body: body);
    final data = _parseJsonMap(res, uri);
    final group = data['group'];
    if (group is! Map<String, dynamic>) {
      throw AuthApiException.internal(
        context: 'Invalid bookmark group response',
        debugDetails: res.body,
      );
    }
    return BookmarkGroup.fromJson(group);
  }

  Future<void> setDefaultGroup({
    required String accessToken,
    required String groupId,
  }) async {
    final uri = _u('/api/bookmarks/groups/${Uri.encodeComponent(groupId)}');
    final res = await AuthRetry.patch(
      uri,
      bearer: accessToken,
      body: {'isDefault': true},
    );
    _ensureOk(res, uri);
  }

  Future<void> deleteGroup({
    required String accessToken,
    required String groupId,
  }) async {
    final uri = _u('/api/bookmarks/groups/${Uri.encodeComponent(groupId)}');
    final res = await AuthRetry.delete(uri, bearer: accessToken);
    _ensureOk(res, uri);
  }

  Future<List<BlogFeedPost>> listBookmarkedPosts({
    required String accessToken,
    String? groupId,
    String? query,
    int limit = 80,
    String sort = 'newest',
  }) async {
    final params = <String, String>{
      'limit': '$limit',
      if (groupId != null && groupId.isNotEmpty) 'groupId': groupId,
      if (query != null && query.trim().isNotEmpty) 'q': query.trim(),
      if (sort == 'oldest') 'sort': 'oldest',
    };
    final uri = _u('/api/bookmarks/posts', params);
    final res = await AuthRetry.get(uri, bearer: accessToken);
    return _parsePosts(res, uri);
  }

  List<BookmarkGroup> _parseGroups(dynamic res, Uri uri) {
    final data = _parseJsonMap(res, uri);
    final rows = data['groups'];
    if (rows is! List) return const [];
    return rows
        .whereType<Map<String, dynamic>>()
        .map(BookmarkGroup.fromJson)
        .toList();
  }

  List<BlogFeedPost> _parsePosts(dynamic res, Uri uri) {
    final data = _parseJsonMap(res, uri);
    final rows = data['posts'];
    if (rows is! List) return const [];
    return rows
        .whereType<Map<String, dynamic>>()
        .map(BlogFeedPost.fromJson)
        .toList();
  }

  Map<String, dynamic> _parseJsonMap(dynamic res, Uri uri) {
    final text = res.body as String;
    _ensureOk(res, uri, body: text);
    if (text.isEmpty) return {};
    return jsonDecode(text) as Map<String, dynamic>;
  }

  void _ensureOk(dynamic res, Uri uri, {String? body}) {
    final text = body ?? res.body as String;
    if (res.statusCode >= 200 && res.statusCode < 300) return;
    throw AuthApiException.fromHttp(
      method: 'HTTP',
      url: uri,
      statusCode: res.statusCode,
      body: text,
    );
  }
}
