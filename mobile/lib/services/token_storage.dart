import 'package:shared_preferences/shared_preferences.dart';

class TokenStorage {
  static const _kAccess = 'auth_access_token';
  static const _kRefresh = 'auth_refresh_token';

  Future<void> saveTokens({required String access, String? refresh}) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_kAccess, access);
    if (refresh != null) {
      await p.setString(_kRefresh, refresh);
    }
  }

  Future<String?> readAccess() async {
    final p = await SharedPreferences.getInstance();
    return p.getString(_kAccess);
  }

  Future<String?> readRefresh() async {
    final p = await SharedPreferences.getInstance();
    return p.getString(_kRefresh);
  }

  Future<void> clear() async {
    final p = await SharedPreferences.getInstance();
    await p.remove(_kAccess);
    await p.remove(_kRefresh);
  }
}
