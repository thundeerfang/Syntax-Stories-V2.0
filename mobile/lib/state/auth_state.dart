import 'package:flutter/foundation.dart';

import '../models/user_summary.dart';
import '../services/auth_api.dart';
import '../services/token_storage.dart';

class AuthState extends ChangeNotifier {
  AuthState({
    AuthApi? api,
    TokenStorage? storage,
  })  : _api = api ?? AuthApi(),
        _storage = storage ?? TokenStorage();

  final AuthApi _api;
  final TokenStorage _storage;

  bool bootstrapping = true;
  bool busy = false;
  String? errorMessage;

  UserSummary? user;
  String? accessToken;
  String? refreshToken;

  /// OTP flow
  String? pendingEmail;
  int? pendingOtpVersion;
  String? pendingFullName;

  String? twoFactorChallengeToken;

  Future<void> bootstrap() async {
    bootstrapping = true;
    errorMessage = null;
    notifyListeners();
    try {
      accessToken = await _storage.readAccess();
      refreshToken = await _storage.readRefresh();
      if (accessToken != null && accessToken!.isNotEmpty) {
        try {
          user = await _api.getMe(accessToken!);
        } on AuthApiException catch (e) {
          if (e.statusCode == 401 && refreshToken != null && refreshToken!.isNotEmpty) {
            try {
              accessToken = await _api.refreshAccessToken(refreshToken!);
              await _storage.saveTokens(access: accessToken!, refresh: refreshToken);
              user = await _api.getMe(accessToken!);
            } catch (_) {
              await _clearLocalSession();
            }
          } else {
            await _clearLocalSession();
          }
        }
      }
    } finally {
      bootstrapping = false;
      notifyListeners();
    }
  }

  Future<void> _clearLocalSession() async {
    user = null;
    accessToken = null;
    refreshToken = null;
    await _storage.clear();
  }

  Future<void> sendLoginOtp(String email) async {
    busy = true;
    errorMessage = null;
    notifyListeners();
    try {
      final out = await _api.sendLoginOtp(email.trim());
      pendingEmail = email.trim();
      pendingOtpVersion = out.otpVersion;
      pendingFullName = null;
    } on AuthApiException catch (e) {
      errorMessage = e.message;
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> sendSignupOtp({required String fullName, required String email}) async {
    busy = true;
    errorMessage = null;
    notifyListeners();
    try {
      final out = await _api.sendSignupOtp(fullName: fullName.trim(), email: email.trim());
      pendingEmail = email.trim();
      pendingOtpVersion = out.otpVersion;
      pendingFullName = fullName.trim();
    } on AuthApiException catch (e) {
      errorMessage = e.message;
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> submitOtpCode(String code) async {
    final email = pendingEmail;
    if (email == null) throw StateError('No pending email');
    busy = true;
    errorMessage = null;
    notifyListeners();
    try {
      final data = await _api.verifyOtp(
        email: email,
        code: code.trim(),
        otpVersion: pendingOtpVersion,
      );
      if (data['twoFactorRequired'] == true) {
        twoFactorChallengeToken = data['challengeToken'] as String?;
        if (twoFactorChallengeToken == null || twoFactorChallengeToken!.isEmpty) {
          throw AuthApiException('2FA required but no challenge token');
        }
        return;
      }
      await _applyTokenResponse(data);
      twoFactorChallengeToken = null;
    } on AuthApiException catch (e) {
      errorMessage = e.message;
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> submitTwoFactor(String totp) async {
    final token = twoFactorChallengeToken;
    if (token == null) throw StateError('No 2FA challenge');
    busy = true;
    errorMessage = null;
    notifyListeners();
    try {
      final data = await _api.verifyTwoFactorLogin(challengeToken: token, token: totp.trim());
      await _applyTokenResponse(data);
      twoFactorChallengeToken = null;
    } on AuthApiException catch (e) {
      errorMessage = e.message;
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> _applyTokenResponse(Map<String, dynamic> data) async {
    final at = data['accessToken'] as String?;
    final rt = data['refreshToken'] as String?;
    if (at == null || at.isEmpty) {
      throw AuthApiException(data['message'] as String? ?? 'No access token');
    }
    accessToken = at;
    refreshToken = rt;
    await _storage.saveTokens(access: at, refresh: rt);
    user = await _api.getMe(at);
    pendingEmail = null;
    pendingOtpVersion = null;
    pendingFullName = null;
  }

  Future<void> logout() async {
    busy = true;
    notifyListeners();
    try {
      final at = accessToken;
      final rt = refreshToken;
      if (at != null) {
        try {
          await _api.logout(accessToken: at, refreshToken: rt);
        } catch (_) {
          /* still clear locally */
        }
      }
      await _clearLocalSession();
      twoFactorChallengeToken = null;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  void clearOtpFlow() {
    pendingEmail = null;
    pendingOtpVersion = null;
    pendingFullName = null;
    twoFactorChallengeToken = null;
    notifyListeners();
  }
}
