import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../utils/paragraph_doc.dart';
import 'api_errors.dart';

class GiphyGif {
  const GiphyGif({
    required this.id,
    required this.title,
    required this.previewUrl,
    required this.originalUrl,
  });

  final String id;
  final String title;
  final String previewUrl;
  final String originalUrl;

  factory GiphyGif.fromJson(Map<String, dynamic> json) {
    final images = json['images'];
    final map = images is Map ? Map<String, dynamic>.from(images) : const <String, dynamic>{};
    return GiphyGif(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      previewUrl: _giphyImageUrl(map, ['fixed_height_small', 'fixed_height', 'downsized_medium']),
      originalUrl: _giphyImageUrl(map, ['original', 'fixed_height', 'downsized_medium']),
    );
  }
}

String _giphyImageUrl(Map<String, dynamic> images, List<String> keys) {
  for (final key in keys) {
    final entry = images[key];
    if (entry is Map) {
      final url = entry['url']?.toString();
      if (url != null && url.isNotEmpty) return url;
    }
  }
  return '';
}

/// GIF search via Syntax Stories API (`GET /api/media/giphy/search`).
class GiphyApi {
  GiphyApi({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        _baseUrlOverride = baseUrl;

  final http.Client _client;
  final String? _baseUrlOverride;

  String get baseUrl => _baseUrlOverride ?? resolveApiBaseUrl();

  Future<List<GiphyGif>> searchGifs(
    String query, {
    int limit = 20,
    int offset = 0,
  }) async {
    final q = query.trim();
    if (q.isEmpty) return const [];

    final uri = Uri.parse('$baseUrl/api/media/giphy/search').replace(
      queryParameters: {
        'q': q,
        'limit': '${limit.clamp(1, 50)}',
        if (offset > 0) 'offset': '$offset',
      },
    );

    try {
      final res = await _client.get(uri, headers: {'Accept': 'application/json'});
      final body = res.body;
      if (res.statusCode < 200 || res.statusCode >= 300) {
        final message = _messageFromBody(body) ?? 'GIF search failed (${res.statusCode})';
        throw StateError(message);
      }

      final data = body.isEmpty ? <String, dynamic>{} : jsonDecode(body) as Map<String, dynamic>;
      if (data['success'] != true) {
        throw StateError(data['message']?.toString() ?? 'GIF search failed');
      }

      final list = data['data'];
      if (list is! List) return const [];
      return [
        for (final item in list)
          if (item is Map) GiphyGif.fromJson(Map<String, dynamic>.from(item)),
      ];
    } catch (e) {
      logApiError('Giphy search failed', method: 'GET', url: uri, cause: e);
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

ParagraphGif paragraphGifFromGiphy(GiphyGif gif) {
  final url = gif.originalUrl.trim();
  return ParagraphGif(
    url: url,
    title: gif.title.trim(),
    sourceUrl: gif.id.isEmpty ? '' : 'https://giphy.com/gifs/${gif.id}',
    align: 'center',
  );
}
