import 'package:http/http.dart' as http;

typedef AuthRefreshHandler = Future<String?> Function({bool force});

/// Global 401 → refresh → retry once (mirrors webapp `setAuthRetryHandler`).
class AuthRetry {
  AuthRetry._();

  static AuthRefreshHandler? _refreshHandler;

  static void setRefreshHandler(AuthRefreshHandler? handler) {
    _refreshHandler = handler;
  }

  static Future<String?> refreshAndGetNewToken({bool force = false}) async {
    final handler = _refreshHandler;
    if (handler == null) return null;
    try {
      return await handler(force: force);
    } catch (_) {
      return null;
    }
  }

  static Future<http.Response> get(
    Uri uri, {
    required String bearer,
    Map<String, String> headers = const {},
    bool isRetry = false,
  }) async {
    final res = await http.get(
      uri,
      headers: {
        'Accept': 'application/json',
        ...headers,
        'Authorization': 'Bearer $bearer',
      },
    );
    if (res.statusCode == 401 && !isRetry) {
      final newToken = await refreshAndGetNewToken(force: true);
      if (newToken != null && newToken.isNotEmpty) {
        return get(uri, bearer: newToken, headers: headers, isRetry: true);
      }
    }
    return res;
  }

  static Future<http.Response> post(
    Uri uri, {
    required String bearer,
    Map<String, String> headers = const {},
    Object? body,
    bool isRetry = false,
  }) async {
    final res = await http.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers,
        'Authorization': 'Bearer $bearer',
      },
      body: body,
    );
    if (res.statusCode == 401 && !isRetry) {
      final newToken = await refreshAndGetNewToken(force: true);
      if (newToken != null && newToken.isNotEmpty) {
        return post(uri, bearer: newToken, headers: headers, body: body, isRetry: true);
      }
    }
    return res;
  }

  static Future<http.Response> put(
    Uri uri, {
    required String bearer,
    Map<String, String> headers = const {},
    Object? body,
    bool isRetry = false,
  }) async {
    final res = await http.put(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers,
        'Authorization': 'Bearer $bearer',
      },
      body: body,
    );
    if (res.statusCode == 401 && !isRetry) {
      final newToken = await refreshAndGetNewToken(force: true);
      if (newToken != null && newToken.isNotEmpty) {
        return put(uri, bearer: newToken, headers: headers, body: body, isRetry: true);
      }
    }
    return res;
  }

  static Future<http.Response> patch(
    Uri uri, {
    required String bearer,
    Map<String, String> headers = const {},
    Object? body,
    bool isRetry = false,
  }) async {
    final res = await http.patch(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers,
        'Authorization': 'Bearer $bearer',
      },
      body: body,
    );
    if (res.statusCode == 401 && !isRetry) {
      final newToken = await refreshAndGetNewToken(force: true);
      if (newToken != null && newToken.isNotEmpty) {
        return patch(uri, bearer: newToken, headers: headers, body: body, isRetry: true);
      }
    }
    return res;
  }

  static Future<http.Response> delete(
    Uri uri, {
    required String bearer,
    Map<String, String> headers = const {},
    Object? body,
    bool isRetry = false,
  }) async {
    final res = await http.delete(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers,
        'Authorization': 'Bearer $bearer',
      },
      body: body,
    );
    if (res.statusCode == 401 && !isRetry) {
      final newToken = await refreshAndGetNewToken(force: true);
      if (newToken != null && newToken.isNotEmpty) {
        return delete(uri, bearer: newToken, headers: headers, body: body, isRetry: true);
      }
    }
    return res;
  }

  static Future<http.StreamedResponse> sendMultipart(
    http.MultipartRequest request, {
    required String bearer,
    bool isRetry = false,
  }) async {
    request.headers['Authorization'] = 'Bearer $bearer';
    request.headers.putIfAbsent('Accept', () => 'application/json');
    final streamed = await request.send();
    if (streamed.statusCode == 401 && !isRetry) {
      final newToken = await refreshAndGetNewToken(force: true);
      if (newToken != null && newToken.isNotEmpty) {
        return sendMultipart(request, bearer: newToken, isRetry: true);
      }
    }
    return streamed;
  }
}
