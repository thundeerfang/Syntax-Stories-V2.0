import 'dart:convert';

/// Builds server-valid `BlogPost.content` JSON from plain mobile body text.
String buildBlogContentFromPlainBody(String body) {
  final lines = body.split('\n');
  final blocks = <Map<String, dynamic>>[];
  var index = 0;

  for (final line in lines) {
    final text = line.trimRight();
    if (text.trim().isEmpty) continue;
    blocks.add({
      'id': 'mobile-p-$index-${DateTime.now().millisecondsSinceEpoch}',
      'type': 'paragraph',
      'payload': {
        'text': text,
        'version': 'plain',
      },
    });
    index++;
  }

  if (blocks.isEmpty) {
    blocks.add({
      'id': 'mobile-p-empty-${DateTime.now().millisecondsSinceEpoch}',
      'type': 'paragraph',
      'payload': {
        'text': body.trim(),
        'version': 'plain',
      },
    });
  }

  return jsonEncode(blocks);
}

String plainTextPreviewFromBlogContent(String contentJson) {
  try {
    final parsed = jsonDecode(contentJson);
    if (parsed is! List) return '';
    final parts = <String>[];
    for (final item in parsed) {
      if (item is! Map) continue;
      if (item['type'] != 'paragraph') continue;
      final payload = item['payload'];
      if (payload is Map && payload['text'] is String) {
        final text = (payload['text'] as String).trim();
        if (text.isNotEmpty) parts.add(text);
      }
    }
    return parts.join('\n\n');
  } catch (_) {
    return '';
  }
}
