/// Validates and normalizes URLs for rich paragraph links (mirrors web editor rules).
class UrlNormalizeResult {
  const UrlNormalizeResult({required this.ok, required this.href, this.error});

  final bool ok;
  final String href;
  final String? error;
}

String collapseDuplicateUrlSchemes(String input) {
  var t = input.trim();
  while (RegExp(r'^https?://https?://', caseSensitive: false).hasMatch(t)) {
    t = t.replaceFirst(RegExp(r'^https?://', caseSensitive: false), '');
  }
  return t;
}

UrlNormalizeResult normalizeUrlForStorage(String input) {
  final s = collapseDuplicateUrlSchemes(input);
  if (s.isEmpty) {
    return const UrlNormalizeResult(ok: false, href: '', error: 'Invalid URL');
  }

  String? originalScheme;
  if (RegExp(r'^http://', caseSensitive: false).hasMatch(s)) {
    originalScheme = 'http';
  } else if (RegExp(r'^https://', caseSensitive: false).hasMatch(s)) {
    originalScheme = 'https';
  }

  var candidate = s;
  if (!RegExp(r'^https?://', caseSensitive: false).hasMatch(candidate)) {
    candidate = 'https://$candidate';
  }

  final uri = Uri.tryParse(candidate);
  if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) {
    return const UrlNormalizeResult(ok: false, href: '', error: 'Only http(s) links');
  }

  final host = uri.host;
  if (host.isEmpty || (host != 'localhost' && !host.contains('.'))) {
    return const UrlNormalizeResult(
      ok: false,
      href: '',
      error: 'Use a full domain (e.g. youtube.com)',
    );
  }

  final scheme = originalScheme == 'http' ? 'http' : 'https';
  final normalized = uri.replace(scheme: scheme).toString();
  return UrlNormalizeResult(ok: true, href: normalized);
}
