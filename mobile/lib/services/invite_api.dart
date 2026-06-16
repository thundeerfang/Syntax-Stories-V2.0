import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'api_errors.dart';
import 'auth_api.dart';
import 'auth_retry.dart';

class InviteReferrer {
  InviteReferrer({
    required this.username,
    required this.fullName,
    required this.profileImg,
  });

  factory InviteReferrer.fromJson(Map<String, dynamic> json) => InviteReferrer(
        username: json['username'] as String? ?? '',
        fullName: json['fullName'] as String? ?? '',
        profileImg: json['profileImg'] as String? ?? '',
      );

  final String username;
  final String fullName;
  final String profileImg;
}

class InviteMe {
  const InviteMe({
    required this.referralCode,
    required this.inviteUrl,
  });

  final String referralCode;
  final String inviteUrl;

  factory InviteMe.fromJson(Map<String, dynamic> json) => InviteMe(
        referralCode: json['referralCode'] as String? ?? '',
        inviteUrl: json['inviteUrl'] as String? ?? '',
      );
}

class InviteStats {
  const InviteStats({this.converted = 0, this.pending = 0, this.rewarded = 0});

  final int converted;
  final int pending;
  final int rewarded;

  factory InviteStats.fromJson(Map<String, dynamic> json) => InviteStats(
        converted: (json['converted'] as num?)?.toInt() ?? 0,
        pending: (json['pending'] as num?)?.toInt() ?? 0,
        rewarded: (json['rewarded'] as num?)?.toInt() ?? 0,
      );
}

class ReferredUser {
  const ReferredUser({
    required this.id,
    required this.username,
    required this.fullName,
    required this.profileImg,
    this.joinedAt,
    this.isActive = false,
  });

  final String id;
  final String username;
  final String fullName;
  final String profileImg;
  final String? joinedAt;
  final bool isActive;

  factory ReferredUser.fromJson(Map<String, dynamic> json) => ReferredUser(
        id: json['id']?.toString() ?? '',
        username: json['username'] as String? ?? '',
        fullName: json['fullName'] as String? ?? '',
        profileImg: json['profileImg'] as String? ?? '',
        joinedAt: json['joinedAt'] as String?,
        isActive: json['isActive'] == true,
      );
}

class InviteApi {
  InviteApi({String? baseUrl}) : _baseUrlOverride = baseUrl;

  final String? _baseUrlOverride;

  String get baseUrl => _baseUrlOverride ?? resolveApiBaseUrl();

  Future<InviteReferrer?> resolveCode(String code) async {
    final uri = Uri.parse('$baseUrl/api/invites/resolve').replace(
      queryParameters: {'code': code.trim()},
    );
    final res = await http.get(
      uri,
      headers: const {'Accept': 'application/json'},
    );
    if (!res.statusCode.toString().startsWith('2')) {
      logApiError(
        'Invite resolve failed',
        method: 'GET',
        url: uri,
        statusCode: res.statusCode,
        responseBody: res.body,
      );
      throw AuthApiException(kGenericUserError, statusCode: res.statusCode);
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (data['valid'] != true) return null;
    return InviteReferrer.fromJson(data);
  }

  Future<InviteMe?> getMe(String accessToken) async {
    return _authedGet('/api/invites/me', accessToken, InviteMe.fromJson);
  }

  Future<InviteStats?> getStats(String accessToken) async {
    return _authedGet('/api/invites/stats', accessToken, InviteStats.fromJson);
  }

  Future<({List<ReferredUser> items, int total})> getReferred(
    String accessToken, {
    int limit = 10,
    int skip = 0,
  }) async {
    final uri = Uri.parse('$baseUrl/api/invites/referred').replace(
      queryParameters: {'limit': '$limit', 'skip': '$skip'},
    );
    try {
      final res = await AuthRetry.get(
        uri,
        bearer: accessToken,
      );
      if (res.statusCode < 200 || res.statusCode >= 300) {
        logApiError(
          'Invite referred failed',
          method: 'GET',
          url: uri,
          statusCode: res.statusCode,
          responseBody: res.body,
        );
        return (items: <ReferredUser>[], total: 0);
      }
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      if (data['success'] != true) return (items: <ReferredUser>[], total: 0);
      final raw = data['items'];
      final items = raw is List
          ? raw.whereType<Map>().map((e) => ReferredUser.fromJson(Map<String, dynamic>.from(e))).toList()
          : <ReferredUser>[];
      return (items: items, total: (data['total'] as num?)?.toInt() ?? items.length);
    } catch (e) {
      logApiError('Invite referred network error', method: 'GET', url: uri, cause: e);
      return (items: <ReferredUser>[], total: 0);
    }
  }

  Future<T?> _authedGet<T>(
    String path,
    String accessToken,
    T Function(Map<String, dynamic> json) parse,
  ) async {
    final uri = Uri.parse('$baseUrl$path');
    try {
      final res = await AuthRetry.get(
        uri,
        bearer: accessToken,
      );
      if (res.statusCode < 200 || res.statusCode >= 300) {
        logApiError(
          'Invite authed GET failed',
          method: 'GET',
          url: uri,
          statusCode: res.statusCode,
          responseBody: res.body,
        );
        return null;
      }
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      if (data['success'] != true) return null;
      return parse(data);
    } catch (e) {
      logApiError('Invite authed GET network error', method: 'GET', url: uri, cause: e);
      return null;
    }
  }
}
