/// Parses mobile OAuth deep links (`syntaxstories://app/...`).
class OAuthDeepLink {
  OAuthDeepLink._();

  static bool isAppLink(Uri uri) =>
      uri.scheme == 'syntaxstories' && uri.host == 'app';

  /// Server failure redirects: `syntaxstories://app/login?error=...`
  static String? errorMessage(Uri uri) {
    if (!isAppLink(uri)) return null;
    final raw = uri.queryParameters['error'];
    if (raw == null || raw.isEmpty) return null;

    final path = uri.path;
    if (path.contains('/auth/callback/') ||
        path == '/login' ||
        path.endsWith('/login') ||
        path == '/settings' ||
        path.endsWith('/settings')) {
      return Uri.decodeComponent(raw);
    }
    return null;
  }

  static bool isCallback(Uri uri) =>
      isAppLink(uri) && uri.path.contains('/auth/callback/');

  static String? exchangeCode(Uri uri) {
    if (!isCallback(uri)) return null;
    final code = uri.queryParameters['code'];
    if (code == null || code.isEmpty) return null;
    return code;
  }

  static String? twoFactorChallenge(Uri uri) {
    if (!isCallback(uri)) return null;
    if (uri.queryParameters['twoFactorRequired'] != '1') return null;
    final token = uri.queryParameters['challengeToken'];
    if (token == null || token.isEmpty) return null;
    return token;
  }
}
