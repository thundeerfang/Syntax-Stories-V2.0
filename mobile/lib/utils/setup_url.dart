/// Normalize product/source URLs — mirrors webapp `MySetupSection.normalizeUrl`.
String normalizeSetupUrl(String raw) {
  final v = raw.trim();
  if (v.isEmpty) return '';
  if (RegExp(r'^https?://', caseSensitive: false).hasMatch(v)) return v;
  return 'https://$v';
}
