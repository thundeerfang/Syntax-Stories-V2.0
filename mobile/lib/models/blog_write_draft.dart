import 'dart:typed_data';

import 'blog_block.dart';

/// In-memory blog compose payload passed from create → review screens.
class BlogWriteDraft {
  const BlogWriteDraft({
    required this.title,
    required this.summary,
    required this.blocks,
    this.thumbnailUrl,
    this.thumbnailBytes,
    this.thumbnailFileName,
    this.editingPostId,
    this.originalStatus,
    this.categories = const [],
    this.tags = const [],
  });

  final String title;
  final String summary;
  final List<BlogBlock> blocks;
  final String? thumbnailUrl;
  final Uint8List? thumbnailBytes;
  final String? thumbnailFileName;
  final String? editingPostId;
  final String? originalStatus;
  final List<String> categories;
  final List<String> tags;

  bool get isEditing =>
      editingPostId != null && editingPostId!.trim().isNotEmpty;

  BlogWriteDraft copyWith({
    String? title,
    String? summary,
    List<BlogBlock>? blocks,
    String? thumbnailUrl,
    Uint8List? thumbnailBytes,
    String? thumbnailFileName,
    String? editingPostId,
    String? originalStatus,
    List<String>? categories,
    List<String>? tags,
    bool clearThumbnailBytes = false,
  }) {
    return BlogWriteDraft(
      title: title ?? this.title,
      summary: summary ?? this.summary,
      blocks: blocks ?? this.blocks,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      thumbnailBytes: clearThumbnailBytes
          ? null
          : (thumbnailBytes ?? this.thumbnailBytes),
      thumbnailFileName: thumbnailFileName ?? this.thumbnailFileName,
      editingPostId: editingPostId ?? this.editingPostId,
      originalStatus: originalStatus ?? this.originalStatus,
      categories: categories ?? this.categories,
      tags: tags ?? this.tags,
    );
  }
}
