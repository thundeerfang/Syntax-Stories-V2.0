import 'package:flutter/material.dart';

/// App-wide theme mode (system / light / dark).
class ThemeController extends ChangeNotifier {
  ThemeMode _mode = ThemeMode.system;

  ThemeMode get mode => _mode;

  void setMode(ThemeMode mode) {
    if (_mode == mode) return;
    _mode = mode;
    notifyListeners();
  }

  void useSystem() => setMode(ThemeMode.system);

  void useLight() => setMode(ThemeMode.light);

  void useDark() => setMode(ThemeMode.dark);
}
