import 'dart:convert';

import 'paragraph_doc.dart';

const int kBlogCommentMinWords = 1;
const int kBlogCommentMaxWords = 80;

Map<String, dynamic> emptyCommentParagraphPayload() => {
      'doc': {
        'type': 'doc',
        'content': [
          {
            'type': 'paragraph',
            'content': <Map<String, dynamic>>[],
          },
        ],
      },
      'version': 'rich-text',
    };

/// Parse stored comment `text` — plain or TipTap JSON doc string.
Map<String, dynamic> paragraphPayloadFromCommentText(String text) {
  final trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.contains('"type"')) {
    try {
      final parsed = jsonDecode(trimmed);
      if (parsed is Map<String, dynamic> && parsed['type'] == 'doc') {
        return {'doc': parsed, 'version': 'rich-text'};
      }
    } catch (_) {}
  }
  return {'text': text, 'version': 'plain'};
}

bool commentDraftHasInlineGif(Map<String, dynamic> payload) {
  try {
    return jsonEncode(payload).contains('"inlineGif"');
  } catch (_) {
    return false;
  }
}

int countCommentWords(Map<String, dynamic> payload) {
  final doc = ParagraphDoc.fromPayload(payload);
  final text = doc.plainText().trim();
  if (text.isEmpty) return 0;
  return text.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length;
}

String? validateCommentDraft(Map<String, dynamic> payload) {
  final hasGif = commentDraftHasInlineGif(payload);
  final words = countCommentWords(payload);
  if (words < kBlogCommentMinWords && !hasGif) {
    return 'Comment must be at least $kBlogCommentMinWords word.';
  }
  if (words > kBlogCommentMaxWords) {
    return 'Comment must be at most $kBlogCommentMaxWords words ($words used).';
  }
  return null;
}

bool commentDraftIsSubmittable(Map<String, dynamic> payload) {
  if (!commentDraftHasContent(payload)) return false;
  return validateCommentDraft(payload) == null;
}

bool commentDraftHasContent(Map<String, dynamic> payload) {
  final doc = ParagraphDoc.fromPayload(payload);
  if (doc.gifs.isNotEmpty) return true;
  return doc.plainText().trim().isNotEmpty;
}

/// Serialize comment for API — mirrors webapp `JSON.stringify(draftDoc)`.
String serializeCommentDraft(Map<String, dynamic> payload) {
  final doc = payload['doc'];
  if (doc is Map<String, dynamic>) return jsonEncode(doc);
  return ParagraphDoc.fromPayload(payload).plainText().trim();
}
