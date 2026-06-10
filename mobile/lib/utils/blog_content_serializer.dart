import 'dart:convert';

import '../models/blog_block.dart';
import '../services/upload_api.dart';
import 'blog_block_factory.dart';
import 'paragraph_doc.dart';

String serializeBlogBlocks(List<BlogBlock> blocks) {
  final cleaned = stripLegacyGifBlocks(blocks);
  return jsonEncode(cleaned.map((b) => b.toJson()).toList());
}

bool blogBlocksHaveContent(List<BlogBlock> blocks) {
  for (final block in stripLegacyGifBlocks(blocks)) {
    if (_blockHasContent(block)) return true;
  }
  return false;
}

bool _blockHasContent(BlogBlock block) {
  final p = block.payload;
  switch (block.type) {
    case BlogBlockType.paragraph:
      final text = p['text']?.toString().trim() ?? '';
      if (text.isNotEmpty) return true;
      final doc = p['doc'];
      return doc is Map && doc.isNotEmpty;
    case BlogBlockType.heading:
      return (p['text']?.toString().trim() ?? '').isNotEmpty;
    case BlogBlockType.partition:
      return true;
    case BlogBlockType.code:
      return (p['code']?.toString().trim() ?? p['text']?.toString().trim() ?? '').isNotEmpty;
    case BlogBlockType.image:
    case BlogBlockType.unsplashImage:
      return (p['url']?.toString().trim() ?? '').isNotEmpty || block.pendingImageBytes != null;
    case BlogBlockType.videoEmbed:
      final videos = p['videos'];
      if (videos is List && videos.any((v) => v.toString().trim().isNotEmpty)) return true;
      return (p['url']?.toString().trim() ?? '').isNotEmpty;
    case BlogBlockType.githubRepo:
      return (p['owner']?.toString().trim() ?? '').isNotEmpty &&
          (p['repo']?.toString().trim() ?? '').isNotEmpty;
    case BlogBlockType.table:
      final rows = p['rows'];
      if (rows is! List) return false;
      for (final row in rows) {
        if (row is! List) continue;
        for (final cell in row) {
          if (cell.toString().trim().isNotEmpty) return true;
        }
      }
      return false;
    case BlogBlockType.mermaidDiagram:
      return (p['source']?.toString().trim() ?? '').isNotEmpty;
    default:
      return false;
  }
}

String previewTextFromBlogBlocks(List<BlogBlock> blocks) {
  final parts = <String>[];
  for (final block in blocks) {
    final p = block.payload;
    switch (block.type) {
      case BlogBlockType.paragraph:
        final text = paragraphPlainTextFromPayload(Map<String, dynamic>.from(p));
        if (text.isNotEmpty) parts.add(text);
      case BlogBlockType.heading:
        final text = p['text']?.toString().trim() ?? '';
        if (text.isNotEmpty) parts.add(text);
      case BlogBlockType.code:
        final code = p['code']?.toString().trim() ?? '';
        if (code.isNotEmpty) parts.add(code);
      case BlogBlockType.image:
      case BlogBlockType.unsplashImage:
        final title = p['title']?.toString().trim() ?? p['caption']?.toString().trim() ?? '';
        parts.add(title.isEmpty ? '[Image]' : title);
      case BlogBlockType.videoEmbed:
        parts.add('[Video]');
      case BlogBlockType.githubRepo:
        final name = p['name']?.toString().trim();
        final owner = p['owner']?.toString().trim();
        final repo = p['repo']?.toString().trim();
        parts.add(name ?? '${owner ?? ''}/${repo ?? ''}'.trim());
      case BlogBlockType.table:
        parts.add('[Table]');
      case BlogBlockType.mermaidDiagram:
        parts.add('[Diagram]');
      default:
        break;
    }
  }
  return parts.join('\n\n');
}

/// Upload pending image bytes on image blocks; returns API-ready blocks.
Future<List<BlogBlock>> prepareBlogBlocksForSubmit(
  List<BlogBlock> blocks, {
  required String accessToken,
  required UploadApi uploadApi,
}) async {
  final out = <BlogBlock>[];
  for (final block in stripLegacyGifBlocks(blocks)) {
    if ((block.type == BlogBlockType.image || block.type == BlogBlockType.unsplashImage) &&
        block.pendingImageBytes != null &&
        (block.payload['url']?.toString().trim().isEmpty ?? true)) {
      final result = await uploadApi.uploadMedia(
        accessToken: accessToken,
        bytes: block.pendingImageBytes!,
        filename: block.pendingImageFileName ?? 'blog-image.jpg',
      );
      final nextPayload = Map<String, dynamic>.from(block.payload)..['url'] = result.url;
      out.add(block.copyWith(payload: nextPayload, clearPendingImage: true));
      continue;
    }
    out.add(block);
  }
  return out;
}
