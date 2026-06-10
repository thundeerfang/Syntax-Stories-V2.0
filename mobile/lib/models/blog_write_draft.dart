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
  });

  final String title;
  final String summary;
  final List<BlogBlock> blocks;
  final String? thumbnailUrl;
  final Uint8List? thumbnailBytes;
  final String? thumbnailFileName;

  BlogWriteDraft copyWith({
    String? title,
    String? summary,
    List<BlogBlock>? blocks,
    String? thumbnailUrl,
    Uint8List? thumbnailBytes,
    String? thumbnailFileName,
    bool clearThumbnailBytes = false,
  }) {
    return BlogWriteDraft(
      title: title ?? this.title,
      summary: summary ?? this.summary,
      blocks: blocks ?? this.blocks,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      thumbnailBytes: clearThumbnailBytes ? null : (thumbnailBytes ?? this.thumbnailBytes),
      thumbnailFileName: thumbnailFileName ?? this.thumbnailFileName,
    );
  }
}
