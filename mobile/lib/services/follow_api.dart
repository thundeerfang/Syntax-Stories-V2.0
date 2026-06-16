import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/follow_user.dart';
import '../models/public_profile_result.dart';
import 'api_errors.dart';
import 'auth_api.dart';
import 'auth_retry.dart';

class FollowListPage {
  const FollowListPage({required this.list, this.nextCursor});

  final List<FollowUser> list;
  final String? nextCursor;
}

class FollowApi {
  FollowApi({String? baseUrl}) : _baseUrlOverride = baseUrl;

  final String? _baseUrlOverride;

  String get baseUrl => _baseUrlOverride ?? resolveApiBaseUrl();

  Uri _u(String path) => Uri.parse('$baseUrl$path');

  Future<FollowListPage> getFollowers(
    String username, {
    String? cursor,
    int limit = 20,
  }) {
    return _fetchList('/api/follow/followers/${Uri.encodeComponent(username.trim())}', cursor, limit);
  }

  Future<FollowListPage> getFollowing(
    String username, {
    String? cursor,
    int limit = 20,
  }) {
    return _fetchList('/api/follow/following/${Uri.encodeComponent(username.trim())}', cursor, limit);
  }

  Future<PublicProfileResult> getPublicProfile(String username) async {
    final slug = username.trim().toLowerCase();
    if (slug.isEmpty) {
      throw AuthApiException('Username required');
    }

    final uri = _u('/api/follow/profile/${Uri.encodeComponent(slug)}');
    try {
      final res = await http.get(uri, headers: {'Accept': 'application/json'});
      final body = res.body;
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw AuthApiException.fromHttp(
          method: 'GET',
          url: uri,
          statusCode: res.statusCode,
          body: body,
        );
      }
      final data = jsonDecode(body) as Map<String, dynamic>;
      if (data['success'] != true) {
        throw AuthApiException(parseServerMessage(body) ?? 'Could not load profile.');
      }
      return PublicProfileResult.fromJson(data);
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'GET', url: uri, cause: e);
    }
  }

  Future<bool> checkFollowing({
    required String username,
    required String bearer,
  }) async {
    final slug = username.trim().toLowerCase();
    if (slug.isEmpty) return false;

    final uri = _u('/api/follow/check/${Uri.encodeComponent(slug)}');
    try {
      final res = await AuthRetry.get(uri, bearer: bearer);
      if (res.statusCode < 200 || res.statusCode >= 300) return false;
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['success'] == true && data['following'] == true;
    } catch (_) {
      return false;
    }
  }

  Future<void> follow({
    required String username,
    required String bearer,
  }) async {
    await _writeFollow(username: username, bearer: bearer, method: 'POST');
  }

  Future<void> unfollow({
    required String username,
    required String bearer,
  }) async {
    await _writeFollow(username: username, bearer: bearer, method: 'DELETE');
  }

  Future<void> _writeFollow({
    required String username,
    required String bearer,
    required String method,
  }) async {
    final slug = username.trim().toLowerCase();
    if (slug.isEmpty) throw AuthApiException('Username required');

    final uri = _u('/api/follow/${Uri.encodeComponent(slug)}');
    try {
      final res = method == 'POST'
          ? await AuthRetry.post(
              uri,
              bearer: bearer,
              body: '{}',
            )
          : await AuthRetry.delete(uri, bearer: bearer);
      final body = res.body;
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw AuthApiException.fromHttp(
          method: method,
          url: uri,
          statusCode: res.statusCode,
          body: body,
        );
      }
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: method, url: uri, cause: e);
    }
  }

  Future<FollowListPage> _fetchList(String path, String? cursor, int limit) async {
    final params = <String, String>{'limit': '${limit.clamp(1, 50)}'};
    if (cursor != null && cursor.isNotEmpty) params['cursor'] = cursor;
    final uri = _u(path).replace(queryParameters: params);

    try {
      final res = await http.get(uri, headers: {'Accept': 'application/json'});
      final body = res.body;
      if (res.statusCode < 200 || res.statusCode >= 300) {
        logApiError(
          'Follow list HTTP error',
          method: 'GET',
          url: uri,
          statusCode: res.statusCode,
          responseBody: body,
        );
        return const FollowListPage(list: []);
      }
      if (body.isEmpty) return const FollowListPage(list: []);
      final data = jsonDecode(body) as Map<String, dynamic>;
      if (data['success'] != true) return const FollowListPage(list: []);
      final raw = data['list'];
      final list = raw is List
          ? raw.whereType<Map>().map((e) => FollowUser.fromJson(Map<String, dynamic>.from(e))).toList()
          : <FollowUser>[];
      final next = data['nextCursor']?.toString();
      return FollowListPage(list: list, nextCursor: next?.isNotEmpty == true ? next : null);
    } catch (e) {
      logApiError('Follow list network error', method: 'GET', url: uri, cause: e);
      return const FollowListPage(list: []);
    }
  }
}
