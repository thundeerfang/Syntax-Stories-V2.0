import 'package:shared_preferences/shared_preferences.dart';

/// Persists whether the user has opened the About page (logo ring turns grey).
class AboutVisitStorage {
  AboutVisitStorage._();

  static const _key = 'syntax_stories_about_visited';

  static Future<bool> hasVisited() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_key) ?? false;
  }

  static Future<void> markVisited() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_key, true);
  }
}
