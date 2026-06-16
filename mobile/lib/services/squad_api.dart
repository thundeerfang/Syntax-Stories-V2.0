import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/squad_feed_row.dart';
import '../models/squad_member.dart';
import '../models/squad_summary.dart';
import 'auth_api.dart';
import 'auth_retry.dart';

class SquadListResult {
  const SquadListResult({required this.squads, this.total = 0});

  final List<SquadSummary> squads;
  final int total;
}

class SquadCreateResult {
  const SquadCreateResult({required this.squad, this.inviteToken});

  final SquadSummary squad;
  final String? inviteToken;
}

class SquadApi {
  SquadApi({String? baseUrl}) : _baseUrlOverride = baseUrl;

  final String? _baseUrlOverride;

  String get baseUrl => _baseUrlOverride ?? resolveApiBaseUrl();

  Uri _u(String path) => Uri.parse('$baseUrl$path');

  List<SquadSummary> _parseSquads(dynamic raw) {
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((e) => SquadSummary.fromJson(Map<String, dynamic>.from(e)))
        .where((s) => s.id.isNotEmpty && s.slug.isNotEmpty)
        .toList();
  }

  /// `GET /api/squads` — public squads (paginated).
  Future<SquadListResult> listPublic({int limit = 96, int offset = 0}) async {
    final uri = _u('/api/squads').replace(
      queryParameters: {'limit': '$limit', 'offset': '$offset'},
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
          context: 'Invalid squads response',
          debugDetails: text,
        );
      }
      return SquadListResult(
        squads: _parseSquads(data['squads']),
        total: (data['total'] as num?)?.toInt() ?? 0,
      );
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'GET', url: uri, cause: e);
    }
  }

  /// `GET /api/squads/mine` — squads the current user belongs to.
  Future<SquadListResult> listMine({required String bearer}) async {
    final uri = _u('/api/squads/mine');
    try {
      final res = await AuthRetry.get(uri, bearer: bearer);
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
          context: 'Invalid mine squads response',
          debugDetails: text,
        );
      }
      return SquadListResult(squads: _parseSquads(data['squads']));
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'GET', url: uri, cause: e);
    }
  }

  /// `GET /api/squads/u/:username` — public squads for a profile (optional auth).
  Future<SquadListResult> listForUser(
    String username, {
    String? bearer,
  }) async {
    final slug = username.trim().toLowerCase();
    if (slug.isEmpty) return const SquadListResult(squads: []);

    final uri = _u('/api/squads/u/${Uri.encodeComponent(slug)}');
    final headers = <String, String>{'Accept': 'application/json'};
    if (bearer != null && bearer.isNotEmpty) {
      headers['Authorization'] = 'Bearer $bearer';
    }

    try {
      final res = await http.get(uri, headers: headers);
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
          context: 'Invalid user squads response',
          debugDetails: text,
        );
      }
      return SquadListResult(squads: _parseSquads(data['squads']));
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'GET', url: uri, cause: e);
    }
  }

  /// `POST /api/squads` — create squad (creator becomes admin).
  Future<SquadCreateResult> create({
    required String bearer,
    required String name,
    String description = '',
    String? iconUrl,
    String? coverBannerUrl,
    required String visibility,
    String? category,
    String postPolicy = 'all_members',
    bool requirePostApproval = false,
    String invitePermission = 'all_members',
  }) async {
    final uri = _u('/api/squads');
    final body = <String, dynamic>{
      'name': name.trim(),
      'description': description.trim(),
      'visibility': visibility,
      'postPolicy': postPolicy,
      'requirePostApproval': requirePostApproval,
      'invitePermission': invitePermission,
      if (iconUrl != null && iconUrl.trim().isNotEmpty) 'iconUrl': iconUrl.trim(),
      if (coverBannerUrl != null && coverBannerUrl.trim().isNotEmpty)
        'coverBannerUrl': coverBannerUrl.trim(),
      if (visibility == 'public' && category != null && category.isNotEmpty) 'category': category,
    };
    try {
      final res = await AuthRetry.post(
        uri,
        bearer: bearer,
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
          context: 'Invalid create squad response',
          debugDetails: text,
        );
      }
      final squadRaw = data['squad'];
      if (squadRaw is! Map) {
        throw AuthApiException.internal(
          context: 'Create squad missing squad payload',
          debugDetails: text,
        );
      }
      return SquadCreateResult(
        squad: SquadSummary.fromJson(Map<String, dynamic>.from(squadRaw)),
        inviteToken: data['inviteToken'] as String?,
      );
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'POST', url: uri, cause: e);
    }
  }

  /// `GET /api/squads/s/:slug` — squad detail (optional auth).
  Future<SquadSummary> getBySlug({required String slug, String? bearer}) async {
    final encoded = Uri.encodeComponent(slug);
    final uri = _u('/api/squads/s/$encoded');
    try {
      final res = bearer != null && bearer.isNotEmpty
          ? await AuthRetry.get(uri, bearer: bearer)
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
          context: 'Invalid squad detail response',
          debugDetails: text,
        );
      }
      final squadRaw = data['squad'];
      if (squadRaw is! Map) {
        throw AuthApiException.internal(
          context: 'Squad detail missing squad payload',
          debugDetails: text,
        );
      }
      return SquadSummary.fromJson(Map<String, dynamic>.from(squadRaw));
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'GET', url: uri, cause: e);
    }
  }

  /// `GET /api/squads/s/:slug/feed` — squad feed (optional auth).
  Future<SquadFeedResult> getFeed({
    required String slug,
    String? bearer,
    int limit = 30,
  }) async {
    final encoded = Uri.encodeComponent(slug);
    final uri = _u('/api/squads/s/$encoded/feed').replace(
      queryParameters: {'limit': '$limit'},
    );
    try {
      final res = bearer != null && bearer.isNotEmpty
          ? await AuthRetry.get(uri, bearer: bearer)
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
          context: 'Invalid squad feed response',
          debugDetails: text,
        );
      }
      final feedRaw = data['feed'];
      final feed = feedRaw is List
          ? feedRaw
              .whereType<Map>()
              .map((e) => SquadFeedRow.fromJson(Map<String, dynamic>.from(e)))
              .toList()
          : <SquadFeedRow>[];
      return SquadFeedResult(
        feed: feed,
        pinnedCount: (data['pinnedCount'] as num?)?.toInt() ?? 0,
      );
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'GET', url: uri, cause: e);
    }
  }

  /// `GET /api/squads/s/:slug/members` — squad members (optional auth).
  Future<List<SquadMember>> listMembers({required String slug, String? bearer}) async {
    final encoded = Uri.encodeComponent(slug);
    final uri = _u('/api/squads/s/$encoded/members');
    try {
      final res = bearer != null && bearer.isNotEmpty
          ? await AuthRetry.get(uri, bearer: bearer)
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
          context: 'Invalid squad members response',
          debugDetails: text,
        );
      }
      final membersRaw = data['members'];
      if (membersRaw is! List) return const [];
      return membersRaw
          .whereType<Map>()
          .map((e) => SquadMember.fromJson(Map<String, dynamic>.from(e)))
          .where((m) => m.userId.isNotEmpty)
          .toList();
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'GET', url: uri, cause: e);
    }
  }

  /// `POST /api/squads/s/:slug/leave` — leave a squad you belong to.
  Future<void> leave({required String slug, required String bearer}) async {
    final encoded = Uri.encodeComponent(slug);
    final uri = _u('/api/squads/s/$encoded/leave');
    try {
      final res = await AuthRetry.post(
        uri,
        bearer: bearer,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(<String, dynamic>{}),
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
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'POST', url: uri, cause: e);
    }
  }

  /// `DELETE /api/squads/s/:slug` — delete squad (admin only).
  Future<void> delete({required String slug, required String bearer}) async {
    final encoded = Uri.encodeComponent(slug);
    final uri = _u('/api/squads/s/$encoded');
    try {
      final res = await AuthRetry.delete(uri, bearer: bearer);
      final text = res.body;
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw AuthApiException.fromHttp(
          method: 'DELETE',
          url: uri,
          statusCode: res.statusCode,
          body: text,
        );
      }
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'DELETE', url: uri, cause: e);
    }
  }

  /// `POST /api/squads/s/:slug/join` — join a public squad.
  Future<void> join({required String slug, required String bearer, String? inviteToken}) async {
    final encoded = Uri.encodeComponent(slug);
    final uri = _u('/api/squads/s/$encoded/join');
    try {
      final body = <String, dynamic>{
        if (inviteToken != null && inviteToken.trim().isNotEmpty)
          'inviteToken': inviteToken.trim(),
      };
      final res = await AuthRetry.post(
        uri,
        bearer: bearer,
        headers: {'Content-Type': 'application/json'},
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
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'POST', url: uri, cause: e);
    }
  }
}
