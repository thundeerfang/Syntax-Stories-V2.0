import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'api_errors.dart';

class UnsplashPhoto {
  const UnsplashPhoto({
    required this.id,
    required this.regularUrl,
    required this.thumbUrl,
    required this.photographerName,
    this.altDescription,
  });

  final String id;
  final String regularUrl;
  final String thumbUrl;
  final String photographerName;
  final String? altDescription;

  factory UnsplashPhoto.fromJson(Map<String, dynamic> json) {
    final urls = json['urls'];
    final urlMap = urls is Map ? Map<String, dynamic>.from(urls) : const <String, dynamic>{};
    final user = json['user'];
    final userMap = user is Map ? Map<String, dynamic>.from(user) : const <String, dynamic>{};
    final name = userMap['name']?.toString().trim() ?? '';
    final regular = urlMap['regular']?.toString() ??
        urlMap['full']?.toString() ??
        urlMap['small']?.toString() ??
        '';
    return UnsplashPhoto(
      id: json['id']?.toString() ?? '',
      regularUrl: regular,
      thumbUrl: urlMap['thumb']?.toString() ??
          urlMap['small']?.toString() ??
          regular,
      photographerName: name,
      altDescription: json['alt_description']?.toString(),
    );
  }

  String get creditLabel =>
      photographerName.isEmpty ? 'Photo on Unsplash' : 'Photo by $photographerName on Unsplash';
}

/// Unsplash search via Syntax Stories API (`GET /api/media/unsplash/search`).
class UnsplashApi {
  UnsplashApi({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        _baseUrlOverride = baseUrl;

  final http.Client _client;
  final String? _baseUrlOverride;

  String get baseUrl => _baseUrlOverride ?? resolveApiBaseUrl();

  Future<List<UnsplashPhoto>> searchPhotos(
    String query, {
    int perPage = 20,
    int page = 1,
  }) async {
    final q = query.trim();
    if (q.isEmpty) return const [];

    final uri = Uri.parse('$baseUrl/api/media/unsplash/search').replace(
      queryParameters: {
        'q': q,
        'per_page': '${perPage.clamp(1, 30)}',
        'page': '$page',
      },
    );

    try {
      final res = await _client.get(uri, headers: {'Accept': 'application/json'});
      final body = res.body;
      if (res.statusCode < 200 || res.statusCode >= 300) {
        final message = _messageFromBody(body) ?? 'Unsplash search failed (${res.statusCode})';
        throw StateError(message);
      }

      final data = body.isEmpty ? <String, dynamic>{} : jsonDecode(body) as Map<String, dynamic>;
      if (data['success'] != true) {
        throw StateError(data['message']?.toString() ?? 'Unsplash search failed');
      }

      final list = data['results'];
      if (list is! List) return const [];
      return [
        for (final item in list)
          if (item is Map) UnsplashPhoto.fromJson(Map<String, dynamic>.from(item)),
      ];
    } catch (e) {
      logApiError('Unsplash search failed', method: 'GET', url: uri, cause: e);
      rethrow;
    }
  }

  String? _messageFromBody(String body) {
    if (body.isEmpty) return null;
    try {
      final data = jsonDecode(body);
      if (data is Map && data['message'] != null) {
        return data['message'].toString();
      }
    } catch (_) {}
    return null;
  }
}
