import 'invite_api.dart';

/// Cached invite / refer data — prefetched after sign-in so settings screens open instantly.
class AccountPrefetch {
  AccountPrefetch._();

  static InviteMe? inviteMe;
  static InviteStats? inviteStats;
  static List<ReferredUser> referred = const [];
  static int referredTotal = 0;

  static Future<void>? _inFlight;

  static bool get hasInvite => inviteMe != null;
  static bool get hasReferData => inviteMe != null && inviteStats != null;

  static void clear() {
    inviteMe = null;
    inviteStats = null;
    referred = const [];
    referredTotal = 0;
    _inFlight = null;
  }

  /// Loads invite card + refer & earn payloads once; shared by settings hub and refer screen.
  static Future<void> prefetch(String accessToken) async {
    if (accessToken.isEmpty) return;
    if (_inFlight != null) return _inFlight!;

    _inFlight = _load(accessToken).whenComplete(() => _inFlight = null);
    return _inFlight!;
  }

  static Future<void> _load(String accessToken) async {
    final api = InviteApi();
    final results = await Future.wait<Object?>([
      api.getMe(accessToken),
      api.getStats(accessToken),
      api.getReferred(accessToken, limit: 10),
    ]);

    inviteMe = results[0] as InviteMe?;
    inviteStats = results[1] as InviteStats?;
    final referredResult = results[2] as ({List<ReferredUser> items, int total})?;
    referred = referredResult?.items ?? const [];
    referredTotal = referredResult?.total ?? 0;
  }
}
