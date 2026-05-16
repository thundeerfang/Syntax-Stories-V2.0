import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/user_summary.dart';

class AuthApiException implements Exception {
  AuthApiException(this.message, {this.statusCode});
  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class AuthApi {
  AuthApi({String? baseUrl}) : baseUrl = baseUrl ?? resolveApiBaseUrl();

  final String baseUrl;

  Uri _u(String path) => Uri.parse('$baseUrl$path');

  String _messageFromBody(String body, int status) {
    try {
      final map = jsonDecode(body) as Map<String, dynamic>?;
      if (map == null) return 'Request failed ($status)';
      final msg = map['message'] as String?;
      if (msg != null && msg.isNotEmpty) return msg;
      final err = map['error'];
      if (err is List && err.isNotEmpty) {
        final first = err.first;
        if (first is Map && first['message'] is String) {
          return first['message'] as String;
        }
      }
    } catch (_) {}
    return 'Request failed ($status)';
  }

  Future<Map<String, dynamic>> _postJson(
    String path, {
    Map<String, dynamic>? body,
    String? bearer,
  }) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      if (bearer != null) 'Authorization': 'Bearer $bearer',
    };
    final res = await http.post(
      _u(path),
      headers: headers,
      body: body == null ? null : jsonEncode(body),
    );
    final text = res.body;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw AuthApiException(_messageFromBody(text, res.statusCode), statusCode: res.statusCode);
    }
    if (text.isEmpty) return {};
    return jsonDecode(text) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> _getJson(String path, {required String bearer}) async {
    final res = await http.get(
      _u(path),
      headers: {
        'Authorization': 'Bearer $bearer',
        'Accept': 'application/json',
      },
    );
    final text = res.body;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw AuthApiException(_messageFromBody(text, res.statusCode), statusCode: res.statusCode);
    }
    if (text.isEmpty) return {};
    return jsonDecode(text) as Map<String, dynamic>;
  }

  /// `POST /auth/send-otp`
  Future<({String message, int? otpVersion})> sendLoginOtp(String email) async {
    final data = await _postJson('/auth/send-otp', body: {'email': email});
    return (
      message: data['message'] as String? ?? 'OK',
      otpVersion: (data['otpVersion'] as num?)?.toInt(),
    );
  }

  /// `POST /auth/signup-email`
  Future<({String message, int? otpVersion})> sendSignupOtp({
    required String fullName,
    required String email,
  }) async {
    final data = await _postJson('/auth/signup-email', body: {'fullName': fullName, 'email': email});
    return (
      message: data['message'] as String? ?? 'OK',
      otpVersion: (data['otpVersion'] as num?)?.toInt(),
    );
  }

  /// `POST /auth/verify-otp`
  Future<Map<String, dynamic>> verifyOtp({
    required String email,
    required String code,
    int? otpVersion,
  }) async {
    final body = <String, dynamic>{'email': email, 'code': code};
    if (otpVersion != null) body['otpVersion'] = otpVersion;
    return _postJson('/auth/verify-otp', body: body);
  }

  /// `POST /auth/2fa/verify-login`
  Future<Map<String, dynamic>> verifyTwoFactorLogin({
    required String challengeToken,
    required String token,
  }) async {
    return _postJson('/auth/2fa/verify-login', body: {
      'challengeToken': challengeToken,
      'token': token,
    });
  }

  /// `POST /auth/refresh`
  Future<String> refreshAccessToken(String refreshToken) async {
    final data = await _postJson('/auth/refresh', body: {'refreshToken': refreshToken});
    final at = data['accessToken'] as String?;
    if (at == null || at.isEmpty) {
      throw AuthApiException('No access token in refresh response');
    }
    return at;
  }

  /// `GET /auth/me`
  Future<UserSummary> getMe(String accessToken) async {
    final data = await _getJson('/auth/me', bearer: accessToken);
    final success = data['success'] as bool? ?? true;
    if (!success) {
      throw AuthApiException(data['message'] as String? ?? 'Failed to load profile');
    }
    final wrapped = data['data'] as Map<String, dynamic>?;
    final user = wrapped?['user'] as Map<String, dynamic>?;
    if (user == null) {
      throw AuthApiException('Invalid profile response');
    }
    return UserSummary.fromJson(user);
  }

  /// `POST /auth/logout`
  Future<void> logout({required String accessToken, String? refreshToken}) async {
    await _postJson(
      '/auth/logout',
      bearer: accessToken,
      body: refreshToken != null ? {'refreshToken': refreshToken} : {},
    );
  }
}
