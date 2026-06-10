import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/user_summary.dart';
import 'api_errors.dart';
import 'altcha_service.dart';
import 'auth_retry.dart';

class RefreshTokenResult {
  const RefreshTokenResult({required this.accessToken, this.refreshToken});

  final String accessToken;
  final String? refreshToken;
}

class AuthApiException implements Exception {
  AuthApiException(
    this.message, {
    this.statusCode,
    this.debugDetails,
  });

  /// User-facing message (safe to show in the UI).
  final String message;
  final int? statusCode;

  /// Technical detail logged to the console only.
  final String? debugDetails;

  factory AuthApiException.fromHttp({
    required String method,
    required Uri url,
    required int statusCode,
    required String body,
  }) {
    final serverMessage = parseServerMessage(body);
    logApiError(
      'HTTP error',
      method: method,
      url: url,
      statusCode: statusCode,
      responseBody: body,
    );
    return AuthApiException(
      userFacingApiMessage(statusCode: statusCode, serverMessage: serverMessage),
      statusCode: statusCode,
      debugDetails: 'HTTP $statusCode ${body.isEmpty ? '(empty body)' : body}',
    );
  }

  factory AuthApiException.network({
    required String method,
    required Uri url,
    required Object cause,
  }) {
    logApiError(
      'Network error',
      method: method,
      url: url,
      cause: cause,
    );
    return AuthApiException(
      kGenericUserError,
      debugDetails: cause.toString(),
    );
  }

  factory AuthApiException.internal({
    required String context,
    required String debugDetails,
    String? userMessage,
  }) {
    logApiError(context, method: '—', url: Uri.parse('app://local'), cause: debugDetails);
    return AuthApiException(userMessage ?? kGenericUserError, debugDetails: debugDetails);
  }

  @override
  String toString() => debugDetails ?? message;
}

class AuthApi {
  AuthApi({String? baseUrl, AltchaService? altcha})
      : _baseUrlOverride = baseUrl,
        _altchaInjected = altcha {
    logApiInfo('AuthApi baseUrl=${this.baseUrl}');
  }

  final String? _baseUrlOverride;
  final AltchaService? _altchaInjected;

  /// Resolved on each read so port corrections apply after hot reload.
  String get baseUrl => _baseUrlOverride ?? resolveApiBaseUrl();

  AltchaService get _altcha => _altchaInjected ?? AltchaService(baseUrl: baseUrl);

  Uri _u(String path) => Uri.parse('$baseUrl$path');

  Future<Map<String, dynamic>> _postJson(
    String path, {
    Map<String, dynamic>? body,
    String? bearer,
  }) {
    return _jsonRequest('POST', path, body: body, bearer: bearer);
  }

  Future<Map<String, dynamic>> _jsonRequest(
    String method,
    String path, {
    Map<String, dynamic>? body,
    String? bearer,
  }) async {
    final uri = _u(path);
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (bearer != null) 'Authorization': 'Bearer $bearer',
    };
    try {
      final encoded = body == null ? null : jsonEncode(body);
      final res = await switch (method) {
        'PATCH' => http.patch(uri, headers: headers, body: encoded),
        _ => http.post(uri, headers: headers, body: encoded),
      };
      final text = res.body;
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw AuthApiException.fromHttp(
          method: method,
          url: uri,
          statusCode: res.statusCode,
          body: text,
        );
      }
      if (text.isEmpty) return {};
      return jsonDecode(text) as Map<String, dynamic>;
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: method, url: uri, cause: e);
    }
  }

  Future<Map<String, dynamic>> _getJson(String path, {required String bearer}) async {
    final uri = _u(path);
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
      if (text.isEmpty) return {};
      return jsonDecode(text) as Map<String, dynamic>;
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'GET', url: uri, cause: e);
    }
  }

  Future<void> _applyAltcha(Map<String, dynamic> body) async {
    final out = await _altcha.resolvePayload();
    switch (out.status) {
      case AltchaStatus.ok:
        body['altcha'] = out.payload!;
      case AltchaStatus.skipped:
        break;
      case AltchaStatus.failed:
        throw AuthApiException.internal(
          context: 'ALTCHA verification failed',
          debugDetails:
              'Could not fetch or solve ALTCHA challenge at $baseUrl/auth/altcha/challenge. '
              'Ensure the server is running (default http://127.0.0.1:$kDefaultLocalApiPort).',
          userMessage: kGenericUserError,
        );
    }
  }

  /// `POST /auth/send-otp`
  Future<({String message, int? otpVersion})> sendLoginOtp(String email) async {
    logApiInfo('sendLoginOtp → $baseUrl/auth/send-otp (email=$email)');
    final body = <String, dynamic>{'email': email};
    await _applyAltcha(body);
    final data = await _postJson('/auth/send-otp', body: body);
    logApiInfo('sendLoginOtp OK');
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
    final body = <String, dynamic>{'fullName': fullName, 'email': email};
    await _applyAltcha(body);
    final data = await _postJson('/auth/signup-email', body: body);
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
    bool? acceptPolicies,
    String? referralCode,
  }) async {
    final body = <String, dynamic>{'email': email, 'code': code};
    if (otpVersion != null) body['otpVersion'] = otpVersion;
    if (acceptPolicies != null) body['acceptPolicies'] = acceptPolicies;
    if (referralCode != null && referralCode.isNotEmpty) body['referralCode'] = referralCode;
    return _postJson('/auth/verify-otp', body: body);
  }

  /// `POST /auth/oauth/exchange`
  Future<Map<String, dynamic>> exchangeOAuthCode(String code) async {
    return _postJson('/auth/oauth/exchange', body: {'code': code});
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

  /// `POST /auth/refresh` — server rotates refresh token; persist both tokens.
  Future<RefreshTokenResult> refreshTokens(String refreshToken) async {
    final data = await _postJson('/auth/refresh', body: {'refreshToken': refreshToken});
    final at = data['accessToken'] as String?;
    if (at == null || at.isEmpty) {
      throw AuthApiException.internal(
        context: 'Refresh token response missing accessToken',
        debugDetails: jsonEncode(data),
      );
    }
    return RefreshTokenResult(
      accessToken: at,
      refreshToken: data['refreshToken'] as String?,
    );
  }

  /// `GET /auth/me`
  Future<UserSummary> getMe(String accessToken) async {
    final data = await _getJson('/auth/me', bearer: accessToken);
    final success = data['success'] as bool? ?? true;
    if (!success) {
      throw AuthApiException.fromHttp(
        method: 'GET',
        url: _u('/auth/me'),
        statusCode: 400,
        body: jsonEncode(data),
      );
    }
    final user = _extractAccountUser(data);
    if (user == null) {
      throw AuthApiException.internal(
        context: 'Invalid /auth/me payload',
        debugDetails: jsonEncode(data),
      );
    }
    return UserSummary.fromJson(user);
  }

  /// `PATCH /auth/profile/:section` — section-scoped profile update.
  Future<UserSummary> updateProfileSection({
    required String accessToken,
    required String section,
    required Map<String, dynamic> data,
  }) async {
    final uri = _u('/auth/profile/${Uri.encodeComponent(section)}');
    final encoded = jsonEncode(data);
    http.Response res;
    try {
      res = await AuthRetry.patch(uri, bearer: accessToken, body: encoded);
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'PATCH', url: uri, cause: e);
    }
    final text = res.body;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw AuthApiException.fromHttp(
        method: 'PATCH',
        url: uri,
        statusCode: res.statusCode,
        body: text,
      );
    }
    final payload = text.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(text) as Map<String, dynamic>;
    final user = _extractAccountUser(payload);
    if (user == null) {
      throw AuthApiException.internal(
        context: 'Invalid profile update response',
        debugDetails: jsonEncode(payload),
      );
    }
    return UserSummary.fromJson(user);
  }

  /// Matches webapp `unwrapAccountUserPayload`: `data.user` or top-level `user`.
  static Map<String, dynamic>? _extractAccountUser(Map<String, dynamic> data) {
    final nested = data['data'];
    if (nested is Map<String, dynamic>) {
      final fromNested = nested['user'];
      if (fromNested is Map<String, dynamic>) return fromNested;
    }
    final topLevel = data['user'];
    if (topLevel is Map<String, dynamic>) return topLevel;
    return null;
  }

  /// `POST /auth/logout`
  Future<void> logout({required String accessToken, String? refreshToken}) async {
    await _postJson(
      '/auth/logout',
      bearer: accessToken,
      body: refreshToken != null ? {'refreshToken': refreshToken} : {},
    );
  }

  /// `POST /auth/link-request` — start OAuth account linking in an external browser.
  Future<String> getLinkRedirectUrl({
    required String accessToken,
    required String provider,
  }) async {
    final uri = _u('/auth/link-request');
    http.Response res;
    try {
      res = await AuthRetry.post(
        uri,
        bearer: accessToken,
        body: jsonEncode({'provider': provider}),
      );
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'POST', url: uri, cause: e);
    }
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
    final redirectUrl = data['redirectUrl'] as String?;
    if (data['success'] != true || redirectUrl == null || redirectUrl.isEmpty) {
      throw AuthApiException.internal(
        context: 'OAuth link request failed',
        debugDetails: text,
        userMessage: parseServerMessage(text) ?? 'Could not start linking.',
      );
    }
    return redirectUrl;
  }

  /// `POST /auth/email-change/init` — sends OTP codes to current and new email.
  Future<String> initEmailChange({
    required String accessToken,
    required String newEmail,
  }) async {
    final uri = _u('/auth/email-change/init');
    http.Response res;
    try {
      res = await AuthRetry.post(
        uri,
        bearer: accessToken,
        body: jsonEncode({'newEmail': newEmail.trim().toLowerCase()}),
      );
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'POST', url: uri, cause: e);
    }
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
        context: 'Email change init failed',
        debugDetails: text,
        userMessage: parseServerMessage(text),
      );
    }
    return parseServerMessage(text) ??
        'Verification codes sent to your current and new email.';
  }

  /// `POST /auth/email-change/verify` — confirms both codes and updates account email.
  Future<String> verifyEmailChange({
    required String accessToken,
    required String currentCode,
    required String newCode,
  }) async {
    final uri = _u('/auth/email-change/verify');
    http.Response res;
    try {
      res = await AuthRetry.post(
        uri,
        bearer: accessToken,
        body: jsonEncode({
          'currentCode': currentCode.trim(),
          'newCode': newCode.trim(),
        }),
      );
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'POST', url: uri, cause: e);
    }
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
        context: 'Email change verify failed',
        debugDetails: text,
        userMessage: parseServerMessage(text),
      );
    }
    return parseServerMessage(text) ??
        'Email updated. All OAuth providers have been unlinked.';
  }

  /// `POST /auth/email-change/cancel` — invalidates pending email change codes.
  Future<void> cancelEmailChange({required String accessToken}) async {
    final uri = _u('/auth/email-change/cancel');
    http.Response res;
    try {
      res = await AuthRetry.post(uri, bearer: accessToken, body: '{}');
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'POST', url: uri, cause: e);
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw AuthApiException.fromHttp(
        method: 'POST',
        url: uri,
        statusCode: res.statusCode,
        body: res.body,
      );
    }
  }

  /// `POST /auth/disconnect/:provider` — revokes all sessions (user must sign in again).
  Future<void> disconnectProvider({
    required String accessToken,
    required String provider,
  }) async {
    final uri = _u('/auth/disconnect/${Uri.encodeComponent(provider)}');
    http.Response res;
    try {
      res = await AuthRetry.post(uri, bearer: accessToken, body: '{}');
    } catch (e) {
      if (e is AuthApiException) rethrow;
      throw AuthApiException.network(method: 'POST', url: uri, cause: e);
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw AuthApiException.fromHttp(
        method: 'POST',
        url: uri,
        statusCode: res.statusCode,
        body: res.body,
      );
    }
  }
}
