import 'dart:io';

import '../config/api_config.dart';

/// Resolve profile/cover media paths for display — mirrors webapp `resolveProfileMediaUrl`.
String resolveProfileMediaUrl(String? raw) {
  final trimmed = raw?.trim();
  if (trimmed == null || trimmed.isEmpty) return '';

  if (trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:')) {
    return _normalizeHostForPlatform(trimmed);
  }

  final base = resolveApiBaseUrl();
  final path = trimmed.startsWith('/') ? trimmed : '/$trimmed';
  return _normalizeHostForPlatform('$base$path');
}

/// Android emulator cannot reach host `localhost` — use `10.0.2.2`.
String _normalizeHostForPlatform(String url) {
  if (!Platform.isAndroid) return url;
  final uri = Uri.tryParse(url);
  if (uri == null) return url;
  final host = uri.host.toLowerCase();
  if (host != 'localhost' && host != '127.0.0.1') return url;
  return uri.replace(host: '10.0.2.2').toString();
}
