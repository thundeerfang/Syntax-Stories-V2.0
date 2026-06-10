import 'dart:io';

import '../services/api_errors.dart';

/// Default local API port (matches project server `PORT=7373`).
const kDefaultLocalApiPort = 7373;

/// macOS AirPlay Receiver binds :5000 — not the Syntax Stories API.
const _legacyWrongLocalPort = 5000;

/// Backend base URL **without** trailing slash (same server as webapp `NEXT_PUBLIC_API_BASE_URL`).
///
/// Override at build/run time:
/// `flutter run --dart-define=API_BASE_URL=http://127.0.0.1:7373`
///
/// Local defaults: iOS/macOS/desktop use loopback; Android emulator uses `10.0.2.2`
/// to reach the host machine.
String resolveApiBaseUrl() {
  const fromEnv = String.fromEnvironment('API_BASE_URL');
  final resolved = fromEnv.isNotEmpty ? _normalizeBaseUrl(fromEnv) : _platformDefaultBaseUrl();
  return _correctKnownBadLocalPort(resolved);
}

String _platformDefaultBaseUrl() {
  if (Platform.isAndroid) {
    return 'http://10.0.2.2:$kDefaultLocalApiPort';
  }
  return 'http://127.0.0.1:$kDefaultLocalApiPort';
}

String _normalizeBaseUrl(String raw) => raw.replaceAll(RegExp(r'/+$'), '');

/// Older runs used `--dart-define=API_BASE_URL=http://127.0.0.1:5000` when the server
/// README still mentioned port 5000. On macOS that hits AirPlay (403), not the API.
String _correctKnownBadLocalPort(String url) {
  final uri = Uri.tryParse(url);
  if (uri == null || uri.port != _legacyWrongLocalPort) return url;

  final host = uri.host.toLowerCase();
  final isLocal = host == '127.0.0.1' ||
      host == 'localhost' ||
      host == '10.0.2.2' ||
      host == '0.0.0.0';
  if (!isLocal) return url;

  final corrected = uri.replace(port: kDefaultLocalApiPort).toString().replaceAll(RegExp(r'/+$'), '');
  logApiInfo(
    'API_BASE_URL used port $_legacyWrongLocalPort (macOS AirPlay). '
    'Using $corrected instead. Stop the app and run without the old dart-define if needed.',
  );
  return corrected;
}
