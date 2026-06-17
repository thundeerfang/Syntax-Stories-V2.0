/// Public webapp origin for opening notification deep links in the browser.
///
/// Override: `flutter run --dart-define=WEB_BASE_URL=https://syntaxstories.com`
String resolveWebBaseUrl() {
  const fromEnv = String.fromEnvironment('WEB_BASE_URL');
  if (fromEnv.isNotEmpty) {
    return fromEnv.replaceAll(RegExp(r'/+$'), '');
  }
  return 'https://syntaxstories.com';
}
