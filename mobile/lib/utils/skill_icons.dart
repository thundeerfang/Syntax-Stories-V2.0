import 'package:http/http.dart' as http;

/// Local fallback when API [iconUrl] is unavailable.
/// Prefer `/api/reference/tech-stack` search or resolve from [ReferenceApi].
const _skillIconsBase = 'https://skillicons.dev/icons?i=';

final Map<String, String> _skillIconSvgCache = {};

const _slugOverrides = <String, String>{
  'typescript': 'ts',
  'javascript': 'js',
  'node.js': 'nodejs',
  'nodejs': 'nodejs',
  'c++': 'cpp',
  'c#': 'cs',
  'vue.js': 'vue',
  'vue': 'vue',
  'next': 'nextjs',
  'next.js': 'nextjs',
  'tailwind': 'tailwind',
  'tailwindcss': 'tailwind',
  'postgres': 'postgresql',
  'postgresql': 'postgresql',
  'go': 'golang',
  'golang': 'golang',
  'k8s': 'kubernetes',
  'aws': 'aws',
  'gcp': 'gcp',
  'figma': 'figma',
  'git': 'git',
  'github': 'github',
  'gitlab': 'gitlab',
  'docker': 'docker',
  'mongodb': 'mongodb',
  'redis': 'redis',
  'html': 'html',
  'css': 'css',
  'react': 'react',
  'angular': 'angular',
  'python': 'python',
  'java': 'java',
  'rust': 'rust',
  'php': 'php',
  'ruby': 'ruby',
  'swift': 'swift',
  'kotlin': 'kotlin',
  'terraform': 'terraform',
  'linux': 'linux',
  'graphql': 'graphql',
  'prisma': 'prisma',
  'vite': 'vite',
  'express': 'express',
  'nestjs': 'nestjs',
  'jest': 'jest',
  'cypress': 'cypress',
};

String skillIconSlug(String displayName) {
  final trimmed = displayName.trim();
  if (trimmed.isEmpty) return '';
  final lower = trimmed.toLowerCase();
  final noSpaces = lower.replaceAll(RegExp(r'\s+'), '');
  final noDots = noSpaces.replaceAll('.', '');
  return _slugOverrides[noDots] ??
      _slugOverrides[lower] ??
      _slugOverrides[noSpaces] ??
      noDots;
}

String skillIconUrl(String displayName) {
  final slug = skillIconSlug(displayName);
  return slug.isEmpty ? '' : '$_skillIconsBase${Uri.encodeComponent(slug)}';
}

String skillIconUrlBySlug(String slug) {
  final s = slug.trim();
  return s.isEmpty ? '' : '$_skillIconsBase${Uri.encodeComponent(s)}';
}

bool isSkillIconSvgUrl(String url) {
  final lower = url.toLowerCase();
  return lower.contains('skillicons.dev') || lower.endsWith('.svg');
}

/// skillicons.dev wraps each icon in an outer SVG with a nested inner SVG.
/// [flutter_svg] cannot render that wrapper, so we extract the inner document.
String flattenSkilliconsSvg(String raw) {
  final trimmed = raw.trim();
  final lower = trimmed.toLowerCase();
  final start = lower.lastIndexOf('<svg');
  if (start < 0) return trimmed;

  final end = lower.indexOf('</svg>', start);
  if (end < 0) return trimmed;

  return trimmed.substring(start, end + 6);
}

/// Fetch and flatten a remote skillicons SVG for [SvgPicture.string].
Future<String?> fetchSkillIconSvg(String url) async {
  final key = url.trim();
  if (key.isEmpty) return null;

  final cached = _skillIconSvgCache[key];
  if (cached != null) return cached;

  try {
    final res = await http.get(Uri.parse(key)).timeout(const Duration(seconds: 8));
    if (res.statusCode < 200 || res.statusCode >= 300) return null;
    final flat = flattenSkilliconsSvg(res.body);
    _skillIconSvgCache[key] = flat;
    return flat;
  } catch (_) {
    return null;
  }
}
