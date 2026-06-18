import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../models/app_feedback.dart';
import '../models/image_upload_kind.dart';
import '../models/user_summary.dart';
import '../services/account_prefetch.dart';
import '../services/api_errors.dart';
import '../services/auth_api.dart';
import '../services/auth_retry.dart';
import '../services/token_storage.dart';
import '../services/upload_api.dart';
import '../utils/jwt_expiry.dart';

class AuthState extends ChangeNotifier {
  AuthState({
    AuthApi? api,
    TokenStorage? storage,
  })  : _api = api ?? AuthApi(),
        _storage = storage ?? TokenStorage() {
    _registerRefreshHandler();
  }

  /// Re-bound on [bootstrap] so hot reload does not leave a stale handler closure.
  void _registerRefreshHandler() {
    AuthRetry.setRefreshHandler(({bool force = false}) {
      return tryRefreshAndReturnNewToken(force: force);
    });
  }

  final AuthApi _api;
  final TokenStorage _storage;

  /// Prevents parallel `/auth/refresh` calls from reusing a rotated refresh token.
  Future<String?>? _refreshInFlight;
  Future<void>? _userRefreshInFlight;

  bool bootstrapping = true;
  bool busy = false;
  String? errorMessage;

  /// OAuth opened in system browser — show blocking overlay until exchange finishes.
  bool oauthPending = false;
  bool oauthExchanging = false;
  DateTime? oauthStartedAt;

  UserSummary? user;
  String? accessToken;
  String? refreshToken;

  /// OTP flow
  String? pendingEmail;
  int? pendingOtpVersion;
  String? pendingFullName;
  bool pendingIsSignup = false;
  String? pendingReferralCode;
  bool pendingAcceptPolicies = false;

  String? twoFactorChallengeToken;

  /// Shown on auth gate after OAuth deep-link errors (no SnackBar).
  String? authBannerMessage;
  AppFeedbackKind? authBannerKind;

  void setAuthBanner(String message, AppFeedbackKind kind) {
    authBannerMessage = message;
    authBannerKind = kind;
    notifyListeners();
  }

  void clearAuthBanner() {
    authBannerMessage = null;
    authBannerKind = null;
    notifyListeners();
  }

  void beginOAuthFlow() {
    oauthPending = true;
    oauthExchanging = false;
    oauthStartedAt = DateTime.now();
    clearAuthBanner();
    notifyListeners();
  }

  void clearOAuthPending() {
    oauthPending = false;
    oauthExchanging = false;
    oauthStartedAt = null;
    notifyListeners();
  }

  void failOAuth(String message, {AppFeedbackKind kind = AppFeedbackKind.error}) {
    oauthPending = false;
    oauthExchanging = false;
    oauthStartedAt = null;
    busy = false;
    setAuthBanner(message, kind);
  }

  void markOAuthExchanging() {
    oauthExchanging = true;
    notifyListeners();
  }

  Future<void> bootstrap() async {
    _registerRefreshHandler();
    bootstrapping = true;
    errorMessage = null;
    notifyListeners();
    try {
      accessToken = await _storage.readAccess();
      refreshToken = await _storage.readRefresh();

      if (accessToken != null &&
          accessToken!.isNotEmpty &&
          accessTokenNeedsRefresh(accessToken)) {
        await tryRefreshAndReturnNewToken();
      }

      if (accessToken != null && accessToken!.isNotEmpty) {
        final ok = await _loadCurrentUser(clearSessionOnFailure: false);
        if (!ok) {
          await _recoverSessionAfterGetMe401();
        }
      } else if (refreshToken != null && refreshToken!.isNotEmpty) {
        await _recoverSessionAfterGetMe401();
      }
    } finally {
      bootstrapping = false;
      notifyListeners();
      if (user != null && accessToken != null && accessToken!.isNotEmpty) {
        unawaited(prefetchSignedInResources());
      }
    }
  }

  Future<void> _clearLocalSession() async {
    user = null;
    accessToken = null;
    refreshToken = null;
    await _storage.clear();
    AccountPrefetch.clear();
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
      pendingIsSignup = false;
      pendingReferralCode = null;
      pendingAcceptPolicies = false;
    } on AuthApiException catch (e) {
      errorMessage = e.message;
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> sendSignupOtp({
    required String fullName,
    required String email,
    String? referralCode,
    required bool acceptPolicies,
  }) async {
    busy = true;
    errorMessage = null;
    notifyListeners();
    try {
      final out = await _api.sendSignupOtp(fullName: fullName.trim(), email: email.trim());
      pendingEmail = email.trim();
      pendingOtpVersion = out.otpVersion;
      pendingFullName = fullName.trim();
      pendingIsSignup = true;
      pendingReferralCode = referralCode;
      pendingAcceptPolicies = acceptPolicies;
    } on AuthApiException catch (e) {
      errorMessage = e.message;
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> resendOtp() async {
    final email = pendingEmail;
    if (email == null) throw StateError('No pending email');
    if (pendingIsSignup) {
      await sendSignupOtp(
        fullName: pendingFullName ?? 'User',
        email: email,
        referralCode: pendingReferralCode,
        acceptPolicies: pendingAcceptPolicies,
      );
    } else {
      await sendLoginOtp(email);
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
        acceptPolicies: pendingIsSignup ? pendingAcceptPolicies : null,
        referralCode: pendingIsSignup ? pendingReferralCode : null,
      );
      if (data['twoFactorRequired'] == true) {
        twoFactorChallengeToken = data['challengeToken'] as String?;
        if (twoFactorChallengeToken == null || twoFactorChallengeToken!.isEmpty) {
          throw AuthApiException.internal(
            context: '2FA required but no challenge token',
            debugDetails: 'verifyOtp response missing challengeToken',
          );
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

  Future<void> completeOAuthExchange(String exchangeCode) async {
    busy = true;
    oauthExchanging = true;
    errorMessage = null;
    notifyListeners();
    try {
      final data = await _api.exchangeOAuthCode(exchangeCode);
      if (data['twoFactorRequired'] == true) {
        twoFactorChallengeToken = data['challengeToken'] as String?;
        if (twoFactorChallengeToken == null || twoFactorChallengeToken!.isEmpty) {
          throw AuthApiException.internal(
            context: '2FA required but no challenge token',
            debugDetails: 'verifyOtp response missing challengeToken',
          );
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
      oauthPending = false;
      oauthExchanging = false;
      oauthStartedAt = null;
      notifyListeners();
    }
  }

  Future<void> _applyTokenResponse(Map<String, dynamic> data) async {
    final at = data['accessToken'] as String?;
    final rt = data['refreshToken'] as String?;
    if (at == null || at.isEmpty) {
      throw AuthApiException.internal(
        context: 'Token response missing accessToken',
        debugDetails: jsonEncode(data),
      );
    }
    accessToken = at;
    refreshToken = rt;
    await _storage.saveTokens(access: at, refresh: rt);
    user = await _api.getMe(at);
    pendingEmail = null;
    pendingOtpVersion = null;
    pendingFullName = null;
    pendingIsSignup = false;
    pendingReferralCode = null;
    pendingAcceptPolicies = false;
    unawaited(prefetchSignedInResources());
  }

  void setTwoFactorChallenge(String challengeToken) {
    twoFactorChallengeToken = challengeToken;
    notifyListeners();
  }

  /// Background refresh of profile + invite/refer caches after sign-in.
  Future<void> prefetchSignedInResources() async {
    final token = accessToken;
    if (token == null || token.isEmpty) return;
    await Future.wait([
      refreshUser(),
      AccountPrefetch.prefetch(token),
    ]);
  }

  /// Re-fetch full profile from `GET /auth/me` (bio, social links, cover, …).
  Future<void> refreshUser() async {
    if (accessToken == null || accessToken!.isEmpty) return;
    if (_userRefreshInFlight != null) return _userRefreshInFlight!;

    _userRefreshInFlight = _refreshUserOnce();
    try {
      await _userRefreshInFlight;
    } finally {
      _userRefreshInFlight = null;
    }
  }

  Future<void> _refreshUserOnce() async {
    final ok = await _loadCurrentUser(clearSessionOnFailure: false);
    if (ok) notifyListeners();
  }

  /// Upload cropped image then PATCH `basic` with new URL (cover 4:1 / avatar 1:1).
  Future<String?> uploadProfileImage({
    required ImageUploadKind kind,
    required Uint8List imageBytes,
    String? originalFileName,
  }) async {
    assert(kind.patchesProfile);
    final token = accessToken;
    if (token == null || token.isEmpty) return 'Not signed in';

    final uploadApi = UploadApi();
    final filename = originalFileName?.trim().isNotEmpty == true
        ? originalFileName!.trim()
        : kind.defaultFilename;
    try {
      final result = kind == ImageUploadKind.cover
          ? await uploadApi.uploadCover(
              accessToken: token,
              bytes: imageBytes,
              filename: filename,
            )
          : await uploadApi.uploadAvatar(
              accessToken: token,
              bytes: imageBytes,
              filename: filename,
            );

      final patch = <String, dynamic>{kind.profileField: result.url};
      final alt = result.imageAlt;
      if (alt != null && alt.isNotEmpty) {
        patch[kind == ImageUploadKind.cover ? 'coverBannerAlt' : 'profileImgAlt'] = alt;
      }
      user = await _api.updateProfileSection(
        accessToken: token,
        section: 'basic',
        data: patch,
      );
      notifyListeners();
      return null;
    } on AuthApiException catch (e) {
      return e.message;
    } catch (_) {
      return kGenericUserError;
    }
  }

  /// PATCH profile section; updates local [user] on success. Returns error message or null.
  Future<String?> updateProfileSection(
    String section,
    Map<String, dynamic> data,
  ) async {
    final token = accessToken;
    if (token == null || token.isEmpty) return 'Not signed in';
    busy = true;
    errorMessage = null;
    notifyListeners();
    try {
      user = await _api.updateProfileSection(
        accessToken: token,
        section: section,
        data: data,
      );
      return null;
    } on AuthApiException catch (e) {
      errorMessage = e.message;
      return e.message;
    } catch (_) {
      errorMessage = kGenericUserError;
      return kGenericUserError;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<bool> _loadCurrentUser({required bool clearSessionOnFailure}) async {
    final token = accessToken;
    if (token == null || token.isEmpty) return false;
    try {
      user = await _api.getMe(token);
      return true;
    } on AuthApiException catch (e) {
      if (clearSessionOnFailure && e.statusCode == 401) {
        await _clearLocalSession();
      }
      return false;
    }
  }

  /// After `/auth/me` 401, rotate refresh token and reload profile (mirrors webapp).
  Future<void> _recoverSessionAfterGetMe401() async {
    final rt = refreshToken;
    if (rt == null || rt.isEmpty) {
      await _clearLocalSession();
      return;
    }

    final newToken = await tryRefreshAndReturnNewToken(force: true);
    if (newToken == null || newToken.isEmpty) return;

    try {
      user = await _api.getMe(newToken);
    } on AuthApiException catch (e) {
      if (e.statusCode == 401) {
        await _clearLocalSession();
      }
    }
  }

  /// Silent refresh — persists rotated refresh token; used by [AuthRetry] on 401.
  Future<String?> tryRefreshAndReturnNewToken({bool force = false}) async {
    if (_refreshInFlight != null) return _refreshInFlight;

    _refreshInFlight = _performRefresh(force: force);
    try {
      return await _refreshInFlight;
    } finally {
      _refreshInFlight = null;
    }
  }

  Future<String?> _performRefresh({required bool force}) async {
    final rt = refreshToken;
    if (rt == null || rt.isEmpty) {
      await _clearLocalSession();
      notifyListeners();
      return null;
    }

    if (!force && !accessTokenNeedsRefresh(accessToken)) {
      return accessToken;
    }

    try {
      final result = await _api.refreshTokens(rt);
      accessToken = result.accessToken;
      if (result.refreshToken != null && result.refreshToken!.isNotEmpty) {
        refreshToken = result.refreshToken;
      }
      await _storage.saveTokens(access: accessToken!, refresh: refreshToken);
      notifyListeners();

      try {
        user = await _api.getMe(accessToken!);
      } catch (_) {
        /* keep existing user if /me fails after refresh */
      }

      return accessToken;
    } on AuthApiException catch (e) {
      if (e.statusCode == 401) {
        await _clearLocalSession();
        notifyListeners();
      }
      return null;
    } catch (_) {
      // Network / server errors — keep stored session so the user can retry.
      return null;
    }
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
    pendingIsSignup = false;
    pendingReferralCode = null;
    pendingAcceptPolicies = false;
    twoFactorChallengeToken = null;
    notifyListeners();
  }
}
