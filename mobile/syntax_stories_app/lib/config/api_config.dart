import 'dart:io';

/// Backend base URL **without** trailing slash (same server as webapp `NEXT_PUBLIC_API_BASE_URL`).
///
/// Override at build/run time:
/// `flutter run --dart-define=API_BASE_URL=https://api.example.com`
///
/// Local defaults: iOS/macOS/desktop use loopback; Android emulator uses `10.0.2.2`
/// to reach the host machine.
String resolveApiBaseUrl() {
  const fromEnv = String.fromEnvironment('API_BASE_URL');
  if (fromEnv.isNotEmpty) {
    return fromEnv.replaceAll(RegExp(r'/+$'), '');
  }
  if (Platform.isAndroid) {
    return 'http://10.0.2.2:5000';
  }
  return 'http://127.0.0.1:5000';
}
