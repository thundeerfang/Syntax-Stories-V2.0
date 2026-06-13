import 'dart:convert';

/// Decode JWT `exp` (seconds) without verifying signature — refresh scheduling only.
int? getJwtExpMs(String accessToken) {
  try {
    final parts = accessToken.split('.');
    if (parts.length < 2) return null;
    var payload = parts[1];
    final mod = payload.length % 4;
    if (mod > 0) payload += '=' * (4 - mod);
    final decoded = utf8.decode(base64Url.decode(payload));
    final map = jsonDecode(decoded) as Map<String, dynamic>;
    final exp = map['exp'];
    if (exp is! num) return null;
    return (exp * 1000).toInt();
  } catch (_) {
    return null;
  }
}

/// Refresh access token this many ms before JWT expiry.
const proactiveRefreshLeadMs = 5 * 60 * 1000;

/// True when there is no usable access token or it expires within the lead window.
bool accessTokenNeedsRefresh(String? accessToken) {
  final token = accessToken?.trim();
  if (token == null || token.isEmpty) return true;
  final expMs = getJwtExpMs(token);
  if (expMs == null) return true;
  return DateTime.now().millisecondsSinceEpoch >= expMs - proactiveRefreshLeadMs;
}
