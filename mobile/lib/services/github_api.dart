import 'dart:convert';

import '../config/api_config.dart';
import '../models/github_repo.dart';
import 'auth_api.dart';
import 'auth_retry.dart';

class GithubApi {
  GithubApi({String? baseUrl}) : _baseUrl = baseUrl ?? resolveApiBaseUrl();

  final String _baseUrl;

  Uri _u(String path) => Uri.parse('$_baseUrl$path');

  Future<List<GithubRepo>> fetchMyRepos({required String accessToken}) async {
    final uri = _u('/api/github/repos');
    try {
      final res = await AuthRetry.get(uri, bearer: accessToken);
      final body = res.body;
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw AuthApiException.fromHttp(
          method: 'GET',
          url: uri,
          statusCode: res.statusCode,
          body: body,
        );
      }
      final data = body.isEmpty
          ? <String, dynamic>{}
          : jsonDecode(body) as Map<String, dynamic>;
      if (data['success'] != true) {
        throw AuthApiException(
          data['message']?.toString().trim().isNotEmpty == true
              ? data['message'].toString().trim()
              : 'Failed to fetch repositories.',
        );
      }
      final raw = data['repos'];
      if (raw is! List) return const [];
      return raw
          .whereType<Map<String, dynamic>>()
          .map(GithubRepo.fromJson)
          .where((r) => r.fullName.isNotEmpty)
          .toList();
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'GET', url: uri, cause: e);
    }
  }

  Future<GithubImportBatchResult> importReposBatch({
    required String accessToken,
    required List<String> fullNames,
  }) async {
    final uri = _u('/api/github/repos/import-batch');
    final payload = jsonEncode({'fullNames': fullNames});
    try {
      final res = await AuthRetry.post(uri, bearer: accessToken, body: payload);
      final body = res.body;
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw AuthApiException.fromHttp(
          method: 'POST',
          url: uri,
          statusCode: res.statusCode,
          body: body,
        );
      }
      final data = body.isEmpty
          ? <String, dynamic>{}
          : jsonDecode(body) as Map<String, dynamic>;
      if (data['success'] != true) {
        throw AuthApiException(
          data['message']?.toString().trim().isNotEmpty == true
              ? data['message'].toString().trim()
              : 'Failed to import repository.',
        );
      }
      final projectsRaw = data['projects'];
      final failedRaw = data['failed'];
      return GithubImportBatchResult(
        projects: projectsRaw is List
            ? projectsRaw.whereType<Map<String, dynamic>>().toList()
            : const [],
        failed: failedRaw is List
            ? failedRaw
                .whereType<Map<String, dynamic>>()
                .map(GithubImportFailure.fromJson)
                .toList()
            : const [],
      );
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'POST', url: uri, cause: e);
    }
  }
}
