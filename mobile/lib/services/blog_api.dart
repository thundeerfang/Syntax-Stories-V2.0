import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/blog_post.dart';
import '../models/blog_taxonomy.dart';
import '../models/blog_feed_post.dart';
import '../models/blog_post_detail.dart';
import '../models/blog_comment.dart';
import '../models/category_members_snapshot.dart';
import 'api_errors.dart';
import 'auth_api.dart';
import 'auth_retry.dart';

class BlogApi {
  BlogApi({String? baseUrl}) : _baseUrlOverride = baseUrl;

  final String? _baseUrlOverride;

  String get baseUrl => _baseUrlOverride ?? resolveApiBaseUrl();

  Uri _u(String path) => Uri.parse('$baseUrl$path');

  /// `GET /api/blog/feed` — public feed (optional auth for viewer engagement flags).
  Future<BlogFeedPage> fetchPublishedFeed({
    int limit = 24,
    int offset = 0,
    String? category,
    String? tag,
    BlogFeedSort sort = BlogFeedSort.recent,
    String? accessToken,
  }) async {
    final params = <String, String>{
      'limit': '$limit',
      if (offset > 0) 'offset': '$offset',
      if (category != null && category.trim().isNotEmpty) 'category': category.trim().toLowerCase(),
      if (tag != null && tag.trim().isNotEmpty) 'tag': tag.trim().toLowerCase(),
      if (sort == BlogFeedSort.views) 'sort': 'views',
    };
    final uri = _u('/api/blog/feed').replace(queryParameters: params);
    try {
      final res = accessToken != null && accessToken.isNotEmpty
          ? await AuthRetry.get(uri, bearer: accessToken)
          : await http.get(uri, headers: {'Accept': 'application/json'});
      return _parseFeedResponse(res, uri);
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'GET', url: uri, cause: e);
    }
  }

  BlogFeedPage _parseFeedResponse(dynamic res, Uri uri) {
    final text = res.body as String;
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
        context: 'Invalid blog feed response',
        debugDetails: text,
        userMessage: parseServerMessage(text),
      );
    }
    return BlogFeedPage.fromJson(data);
  }

  /// `GET /api/blog/u/:username/posts` — mirrors webapp `blogApi.getUserPublishedPosts`.
  Future<List<BlogFeedPost>> getUserPublishedPosts({
    required String username,
    int limit = 24,
    String? accessToken,
  }) async {
    final u = Uri.encodeComponent(username.trim());
    final uri = _u('/api/blog/u/$u/posts').replace(
      queryParameters: {'limit': '$limit'},
    );
    try {
      final res = accessToken != null && accessToken.isNotEmpty
          ? await AuthRetry.get(uri, bearer: accessToken)
          : await http.get(uri, headers: {'Accept': 'application/json'});
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
          context: 'Invalid user posts response',
          debugDetails: text,
          userMessage: parseServerMessage(text),
        );
      }
      final rows = data['posts'];
      if (rows is! List) return const [];
      return rows
          .whereType<Map>()
          .map((row) => BlogFeedPost.fromJson(Map<String, dynamic>.from(row)))
          .toList();
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'GET', url: uri, cause: e);
    }
  }

  /// `GET /api/blog/p/:username/:slug` — full published post.
  Future<BlogPostDetail> fetchPublishedPost({
    required String username,
    required String slug,
    String? accessToken,
  }) async {
    final u = Uri.encodeComponent(username.trim());
    final s = Uri.encodeComponent(slug.trim());
    final uri = _u('/api/blog/p/$u/$s');
    try {
      final res = accessToken != null && accessToken.isNotEmpty
          ? await AuthRetry.get(uri, bearer: accessToken)
          : await http.get(uri, headers: {'Accept': 'application/json'});
      return _parseDetailResponse(res, uri);
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'GET', url: uri, cause: e);
    }
  }

  BlogPostDetail _parseDetailResponse(dynamic res, Uri uri) {
    final text = res.body as String;
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
        context: 'Invalid blog post response',
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
    return BlogPostDetail.fromJson(post);
  }

  /// `POST /api/blog/p/:username/:slug/respect`
  Future<({bool respecting, int respectCount})> setPostRespect({
    required String username,
    required String slug,
    required bool respecting,
    required String accessToken,
  }) async {
    return _engagementToggle(
      path: '/api/blog/p/${Uri.encodeComponent(username)}/${Uri.encodeComponent(slug)}/respect',
      body: {'respecting': respecting},
      accessToken: accessToken,
      activeKey: 'respecting',
      countKey: 'respectCount',
    );
  }

  /// `POST /api/blog/p/:username/:slug/repost`
  Future<({bool active, int count})> setPostRepost({
    required String username,
    required String slug,
    required bool reposting,
    required String accessToken,
  }) async {
    final result = await _engagementToggle(
      path: '/api/blog/p/${Uri.encodeComponent(username)}/${Uri.encodeComponent(slug)}/repost',
      body: {'reposting': reposting},
      accessToken: accessToken,
      activeKey: 'reposting',
      countKey: 'repostCount',
    );
    return (active: result.respecting, count: result.respectCount);
  }

  /// `POST /api/blog/p/:username/:slug/bookmark`
  Future<({bool active, int count})> setPostBookmark({
    required String username,
    required String slug,
    required bool bookmarked,
    required String accessToken,
  }) async {
    final result = await _engagementToggle(
      path: '/api/blog/p/${Uri.encodeComponent(username)}/${Uri.encodeComponent(slug)}/bookmark',
      body: {'bookmarked': bookmarked},
      accessToken: accessToken,
      activeKey: 'bookmarked',
      countKey: 'bookmarkCount',
    );
    return (active: result.respecting, count: result.respectCount);
  }

  Future<({bool respecting, int respectCount})> _engagementToggle({
    required String path,
    required Map<String, dynamic> body,
    required String accessToken,
    required String activeKey,
    required String countKey,
  }) async {
    final uri = _u(path);
    try {
      final res = await AuthRetry.post(
        uri,
        bearer: accessToken,
        body: jsonEncode(body),
      );
      final text = res.body;
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw AuthApiException.fromHttp(
          method: 'POST',
          url: uri,
          statusCode: res.statusCode,
          body: text,
        );
      }
      final data = text.isEmpty ? <String, dynamic>{} : jsonDecode(text) as Map<String, dynamic>;
      if (data['success'] != true) {
        throw AuthApiException.internal(
          context: 'Engagement update failed',
          debugDetails: text,
          userMessage: parseServerMessage(text),
        );
      }
      return (
        respecting: data[activeKey] == true,
        respectCount: data[countKey] is num ? (data[countKey] as num).toInt() : 0,
      );
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'POST', url: uri, cause: e);
    }
  }

  /// `GET /api/blog/p/:username/:slug/comments`
  Future<BlogCommentsPage> fetchComments({
    required String username,
    required String slug,
    int limit = kCommentPageSize,
    int offset = 0,
    String? parentId,
    String? accessToken,
  }) async {
    final u = Uri.encodeComponent(username.trim());
    final s = Uri.encodeComponent(slug.trim());
    final params = <String, String>{
      'limit': '$limit',
      'offset': '$offset',
      if (parentId != null && parentId.trim().isNotEmpty) 'parentId': parentId.trim(),
    };
    final uri = _u('/api/blog/p/$u/$s/comments').replace(queryParameters: params);
    try {
      final res = accessToken != null && accessToken.isNotEmpty
          ? await AuthRetry.get(uri, bearer: accessToken)
          : await http.get(uri, headers: {'Accept': 'application/json'});
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
          context: 'Invalid comments response',
          debugDetails: text,
          userMessage: parseServerMessage(text),
        );
      }
      return BlogCommentsPage.fromJson(data);
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'GET', url: uri, cause: e);
    }
  }

  /// `POST /api/blog/p/:username/:slug/comments`
  Future<BlogComment> postComment({
    required String username,
    required String slug,
    required String text,
    required String accessToken,
    String? parentId,
  }) async {
    final u = Uri.encodeComponent(username.trim());
    final s = Uri.encodeComponent(slug.trim());
    final uri = _u('/api/blog/p/$u/$s/comments');
    final body = <String, dynamic>{
      'text': text.trim(),
      if (parentId != null && parentId.isNotEmpty) 'parentId': parentId,
    };
    try {
      final res = await AuthRetry.post(
        uri,
        bearer: accessToken,
        body: jsonEncode(body),
      );
      final responseText = res.body;
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw AuthApiException.fromHttp(
          method: 'POST',
          url: uri,
          statusCode: res.statusCode,
          body: responseText,
        );
      }
      final data = responseText.isEmpty
          ? <String, dynamic>{}
          : jsonDecode(responseText) as Map<String, dynamic>;
      if (data['success'] != true) {
        throw AuthApiException.internal(
          context: 'Comment post failed',
          debugDetails: responseText,
          userMessage: parseServerMessage(responseText),
        );
      }
      final comment = data['comment'];
      if (comment is! Map<String, dynamic>) {
        throw AuthApiException.internal(
          context: 'Missing comment in response',
          debugDetails: responseText,
        );
      }
      return BlogComment.fromJson(comment);
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'POST', url: uri, cause: e);
    }
  }

  Future<BlogComment> patchComment({
    required String username,
    required String slug,
    required String commentId,
    required String text,
    required String accessToken,
  }) async {
    final u = Uri.encodeComponent(username.trim());
    final s = Uri.encodeComponent(slug.trim());
    final id = Uri.encodeComponent(commentId.trim());
    final uri = _u('/api/blog/p/$u/$s/comments/$id');
    try {
      final res = await AuthRetry.patch(
        uri,
        bearer: accessToken,
        body: jsonEncode({'text': text.trim()}),
      );
      final responseText = res.body;
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw AuthApiException.fromHttp(
          method: 'PATCH',
          url: uri,
          statusCode: res.statusCode,
          body: responseText,
        );
      }
      final data = responseText.isEmpty
          ? <String, dynamic>{}
          : jsonDecode(responseText) as Map<String, dynamic>;
      if (data['success'] != true) {
        throw AuthApiException.internal(
          context: 'Comment update failed',
          debugDetails: responseText,
          userMessage: parseServerMessage(responseText),
        );
      }
      final comment = data['comment'];
      if (comment is! Map<String, dynamic>) {
        throw AuthApiException.internal(
          context: 'Missing comment in response',
          debugDetails: responseText,
        );
      }
      return BlogComment.fromJson(comment);
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'PATCH', url: uri, cause: e);
    }
  }

  Future<void> deleteComment({
    required String username,
    required String slug,
    required String commentId,
    required String accessToken,
  }) async {
    final u = Uri.encodeComponent(username.trim());
    final s = Uri.encodeComponent(slug.trim());
    final id = Uri.encodeComponent(commentId.trim());
    final uri = _u('/api/blog/p/$u/$s/comments/$id');
    try {
      final res = await AuthRetry.delete(uri, bearer: accessToken);
      final responseText = res.body;
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw AuthApiException.fromHttp(
          method: 'DELETE',
          url: uri,
          statusCode: res.statusCode,
          body: responseText,
        );
      }
      final data = responseText.isEmpty
          ? <String, dynamic>{}
          : jsonDecode(responseText) as Map<String, dynamic>;
      if (data['success'] != true) {
        throw AuthApiException.internal(
          context: 'Comment delete failed',
          debugDetails: responseText,
          userMessage: parseServerMessage(responseText),
        );
      }
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'DELETE', url: uri, cause: e);
    }
  }

  Future<({int likeCount, bool likedByViewer})> toggleCommentLike({
    required String username,
    required String slug,
    required String commentId,
    required String accessToken,
  }) async {
    final u = Uri.encodeComponent(username.trim());
    final s = Uri.encodeComponent(slug.trim());
    final id = Uri.encodeComponent(commentId.trim());
    final uri = _u('/api/blog/p/$u/$s/comments/$id/like');
    try {
      final res = await AuthRetry.post(uri, bearer: accessToken);
      final responseText = res.body;
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw AuthApiException.fromHttp(
          method: 'POST',
          url: uri,
          statusCode: res.statusCode,
          body: responseText,
        );
      }
      final data = responseText.isEmpty
          ? <String, dynamic>{}
          : jsonDecode(responseText) as Map<String, dynamic>;
      if (data['success'] != true) {
        throw AuthApiException.internal(
          context: 'Comment like failed',
          debugDetails: responseText,
          userMessage: parseServerMessage(responseText),
        );
      }
      return (
        likeCount: data['likeCount'] is num ? (data['likeCount'] as num).toInt() : 0,
        likedByViewer: data['likedByViewer'] == true,
      );
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'POST', url: uri, cause: e);
    }
  }

  /// `GET /api/blog/taxonomy/categories` — paginated category list.
  Future<BlogTaxonomyPage> fetchCategoriesPage({
    int offset = 0,
    int limit = 6,
    String? query,
    String sort = 'name-asc',
  }) async {
    final params = <String, String>{
      'offset': '$offset',
      'limit': '$limit',
      'sort': sort,
      if (query != null && query.trim().isNotEmpty) 'q': query.trim(),
    };
    final uri = _u('/api/blog/taxonomy/categories').replace(queryParameters: params);
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
          context: 'Invalid categories response',
          debugDetails: text,
        );
      }
      return BlogTaxonomyPage.fromJson(data);
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'GET', url: uri, cause: e);
    }
  }

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

  /// `GET /api/blog/categories/following` — slugs the current user follows.
  Future<List<String>> listFollowedCategories({required String accessToken}) async {
    final uri = _u('/api/blog/categories/following');
    try {
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
      final data = text.isEmpty ? <String, dynamic>{} : jsonDecode(text) as Map<String, dynamic>;
      if (data['success'] != true) {
        throw AuthApiException.internal(
          context: 'Invalid followed categories response',
          debugDetails: text,
        );
      }
      final slugs = data['slugs'];
      if (slugs is! List) return const [];
      return slugs
          .whereType<String>()
          .map((s) => s.trim().toLowerCase())
          .where((s) => s.isNotEmpty)
          .toList();
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'GET', url: uri, cause: e);
    }
  }

  /// `POST /api/blog/categories/:slug/follow`
  Future<void> followCategory({
    required String slug,
    required String accessToken,
  }) async {
    final encoded = Uri.encodeComponent(slug.trim().toLowerCase());
    final uri = _u('/api/blog/categories/$encoded/follow');
    try {
      final res = await AuthRetry.post(
        uri,
        bearer: accessToken,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(<String, dynamic>{}),
      );
      _ensureSuccess(res, uri, method: 'POST');
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'POST', url: uri, cause: e);
    }
  }

  /// `DELETE /api/blog/categories/:slug/follow`
  Future<void> unfollowCategory({
    required String slug,
    required String accessToken,
  }) async {
    final encoded = Uri.encodeComponent(slug.trim().toLowerCase());
    final uri = _u('/api/blog/categories/$encoded/follow');
    try {
      final res = await AuthRetry.delete(uri, bearer: accessToken);
      _ensureSuccess(res, uri, method: 'DELETE');
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'DELETE', url: uri, cause: e);
    }
  }

  /// `GET /api/blog/tags/explore` — trending, popular, and recent tags.
  Future<BlogTagsExplore> fetchTagsExplore() async {
    final uri = _u('/api/blog/tags/explore');
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
          context: 'Invalid tags explore response',
          debugDetails: text,
        );
      }
      return BlogTagsExplore.fromJson(data);
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'GET', url: uri, cause: e);
    }
  }

  /// `GET /api/blog/categories/members-preview` — follower avatars for category lanes.
  Future<CategoryMembersSnapshot> fetchCategoryMembersPreview(String slug) async {
    final normalized = slug.trim().toLowerCase();
    if (normalized.isEmpty) return const CategoryMembersSnapshot();

    final uri = _u('/api/blog/categories/members-preview').replace(
      queryParameters: {'slugs': normalized},
    );
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
          context: 'Invalid category members response',
          debugDetails: text,
        );
      }
      final categories = data['categories'];
      if (categories is! Map) return const CategoryMembersSnapshot();
      final row = categories[normalized];
      if (row is! Map) return const CategoryMembersSnapshot();
      return CategoryMembersSnapshot.fromJson(Map<String, dynamic>.from(row));
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'GET', url: uri, cause: e);
    }
  }

  /// `GET /api/blog/tags/list` — paginated tag list.
  Future<BlogTaxonomyPage> fetchTagsPage({
    int offset = 0,
    int limit = 24,
    String? query,
    String sort = 'posts-desc',
  }) async {
    final params = <String, String>{
      'offset': '$offset',
      'limit': '$limit',
      'sort': sort,
      if (query != null && query.trim().isNotEmpty) 'q': query.trim(),
    };
    final uri = _u('/api/blog/tags/list').replace(queryParameters: params);
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
          context: 'Invalid tags list response',
          debugDetails: text,
        );
      }
      return BlogTaxonomyPage.fromJson(data);
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
    List<String>? categories,
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
      if (categories != null && categories.isNotEmpty) 'categories': categories,
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

  /// `GET /api/blog?status=` — owner's posts by status.
  Future<List<BlogPost>> listMyPosts({
    required String accessToken,
    required String status,
  }) async {
    final uri = _u('/api/blog').replace(
      queryParameters: {'status': status},
    );
    try {
      final res = await AuthRetry.get(uri, bearer: accessToken);
      return _parsePostListResponse(res, uri);
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'GET', url: uri, cause: e);
    }
  }

  /// `DELETE /api/blog/post/:id` — move to trash.
  Future<void> deletePost({
    required String postId,
    required String accessToken,
  }) async {
    final id = Uri.encodeComponent(postId.trim());
    final uri = _u('/api/blog/post/$id');
    try {
      final res = await AuthRetry.delete(uri, bearer: accessToken);
      _ensureSuccess(res, uri, method: 'DELETE');
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'DELETE', url: uri, cause: e);
    }
  }

  /// `PUT /api/blog/post/:id/restore` — restore from trash.
  Future<BlogPost> restorePost({
    required String postId,
    required String accessToken,
  }) async {
    final id = Uri.encodeComponent(postId.trim());
    final uri = _u('/api/blog/post/$id/restore');
    try {
      final res = await AuthRetry.put(uri, bearer: accessToken, body: '{}');
      return _parsePostResponse(res, uri, method: 'PUT');
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'PUT', url: uri, cause: e);
    }
  }

  /// `DELETE /api/blog/post/:id/permanent` — purge from trash.
  Future<void> purgePostPermanent({
    required String postId,
    required String accessToken,
  }) async {
    final id = Uri.encodeComponent(postId.trim());
    final uri = _u('/api/blog/post/$id/permanent');
    try {
      final res = await AuthRetry.delete(uri, bearer: accessToken);
      _ensureSuccess(res, uri, method: 'DELETE');
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'DELETE', url: uri, cause: e);
    }
  }

  List<BlogPost> _parsePostListResponse(http.Response res, Uri uri) {
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
        context: 'Invalid blog list response',
        debugDetails: text,
        userMessage: parseServerMessage(text),
      );
    }
    final rows = data['posts'];
    if (rows is! List) return const [];
    return rows
        .whereType<Map>()
        .map((row) => BlogPost.fromJson(Map<String, dynamic>.from(row)))
        .toList();
  }

  void _ensureSuccess(http.Response res, Uri uri, {required String method}) {
    final text = res.body;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw AuthApiException.fromHttp(
        method: method,
        url: uri,
        statusCode: res.statusCode,
        body: text,
      );
    }
    if (text.isEmpty) return;
    final data = jsonDecode(text);
    if (data is Map && data['success'] == false) {
      throw AuthApiException.internal(
        context: 'Blog API failed',
        debugDetails: text,
        userMessage: parseServerMessage(text),
      );
    }
  }
}
