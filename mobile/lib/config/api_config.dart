import 'dart:io';

import '../services/api_errors.dart';

/// Default local API port (matches project server `PORT=7373`).
const kDefaultLocalApiPort = 7373;

/// Production API (Render) — used for release builds unless overridden.
const kProductionApiBaseUrl = 'https://syntax-stories-v2.onrender.com';

/// macOS AirPlay Receiver binds :5000 — not the Syntax Stories API.
const _legacyWrongLocalPort = 5000;

/// When `true`, use platform-local defaults (127.0.0.1 / Android 10.0.2.2).
///
/// Local dev:
/// `flutter run --dart-define=USE_LOCAL_API=true`
///
/// Release / production builds should omit this and use [kProductionApiBaseUrl]
/// (or pass `--dart-define=API_BASE_URL=...`).
const useLocalApi = bool.fromEnvironment('USE_LOCAL_API');

/// Backend base URL **without** trailing slash (same server as webapp `NEXT_PUBLIC_API_BASE_URL`).
///
/// Priority:
/// 1. `API_BASE_URL` dart-define (explicit override)
/// 2. `USE_LOCAL_API=true` → local loopback / emulator host
/// 3. [kProductionApiBaseUrl]
String resolveApiBaseUrl() {
  const fromEnv = String.fromEnvironment('API_BASE_URL');
  if (fromEnv.isNotEmpty) {
    return _correctKnownBadLocalPort(_normalizeBaseUrl(fromEnv));
  }
  if (useLocalApi) {
    return _correctKnownBadLocalPort(_platformDefaultBaseUrl());
  }
  return kProductionApiBaseUrl;
}

/// Whether the resolved API host is a local dev machine.
bool isLocalApiBaseUrl([String? baseUrl]) {
  final uri = Uri.tryParse(baseUrl ?? resolveApiBaseUrl());
  if (uri == null) return false;
  final host = uri.host.toLowerCase();
  return host == '127.0.0.1' ||
      host == 'localhost' ||
      host == '10.0.2.2' ||
      host == '0.0.0.0';
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
