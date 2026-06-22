/// Legacy schema / OAuth placeholder — not shown as a real user-written bio.
const kDefaultProfileBio =
    'Welcome to Syntax Stories 🧑🏻‍💻, you can add your bio you want..🚀';

const kPlaceholderProfileBios = {
  'Hey There Welcome To Syntax Stories',
  kDefaultProfileBio,
  'Welcome to Syntax Stories 🧑🏻‍💻',
};

bool isPlaceholderProfileBio(String? bio) {
  final trimmed = bio?.trim();
  if (trimmed == null || trimmed.isEmpty) return true;
  return kPlaceholderProfileBios.contains(trimmed);
}

/// Bio string to render — uses API value; empty when absent or placeholder.
String? resolveProfileBio(String? bio) {
  if (isPlaceholderProfileBio(bio)) return null;
  final trimmed = bio?.trim();
  if (trimmed != null && trimmed.isNotEmpty) return trimmed;
  return null;
}

/// Strip markdown/HTML from profile bio for mobile display.
String bioToPlainText(String? raw) {
  if (raw == null || raw.trim().isEmpty) return '';
  var s = raw.trim();
  s = s.replaceAll('&nbsp;', ' ');
  s = s.replaceAll('\u00a0', ' ');
  s = s.replaceAll(RegExp(r'\*\*([^*\n]+)\*\*'), r'$1');
  s = s.replaceAll(RegExp(r'__([^_\n]+)__'), r'$1');
  s = s.replaceAll(RegExp(r'\*([^*\n]+)\*'), r'$1');
  s = s.replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n');
  s = s.replaceAll(RegExp(r'</p>\s*<p>', caseSensitive: false), '\n');
  s = s.replaceAll(RegExp(r'<[^>]*>'), ' ');
  s = s.replaceAll(RegExp(r'\s+'), ' ').trim();
  return s;
}

String normalizeExternalUrl(String url) {
  final trimmed = url.trim();
  if (trimmed.isEmpty) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return 'https://$trimmed';
}
