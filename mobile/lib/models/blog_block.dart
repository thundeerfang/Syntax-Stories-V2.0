import 'dart:convert';
import 'dart:typed_data';

const blogPrimarySectionId = 's-1';
const blogMaxBlocksPerSection = 20;

/// Server-aligned blog content block (`BlogPost.content` is `JSON.stringify(Block[])`).
class BlogBlock {
  BlogBlock({
    required this.id,
    required this.type,
    this.sectionId = blogPrimarySectionId,
    Map<String, dynamic>? payload,
    this.pendingImageBytes,
    this.pendingImageFileName,
  }) : payload = Map<String, dynamic>.from(payload ?? {});

  factory BlogBlock.fromJson(Map<String, dynamic> json) {
    final payload = json['payload'];
    return BlogBlock(
      id: json['id']?.toString() ?? '',
      type: json['type']?.toString() ?? BlogBlockType.paragraph,
      sectionId: json['sectionId']?.toString(),
      payload: payload is Map ? Map<String, dynamic>.from(payload) : null,
    );
  }

  final String id;
  final String type;
  final String? sectionId;
  final Map<String, dynamic> payload;

  /// Client-only bytes for image blocks before upload (not sent to API).
  final Uint8List? pendingImageBytes;
  final String? pendingImageFileName;

  BlogBlock copyWith({
    String? id,
    String? type,
    String? sectionId,
    Map<String, dynamic>? payload,
    Uint8List? pendingImageBytes,
    String? pendingImageFileName,
    bool clearPendingImage = false,
  }) {
    return BlogBlock(
      id: id ?? this.id,
      type: type ?? this.type,
      sectionId: sectionId ?? this.sectionId,
      payload: payload ?? Map<String, dynamic>.from(this.payload),
      pendingImageBytes: clearPendingImage ? null : (pendingImageBytes ?? this.pendingImageBytes),
      pendingImageFileName:
          clearPendingImage ? null : (pendingImageFileName ?? this.pendingImageFileName),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      if (sectionId != null && sectionId!.isNotEmpty) 'sectionId': sectionId,
      if (payload.isNotEmpty) 'payload': payload,
    };
  }
}

abstract final class BlogBlockType {
  static const paragraph = 'paragraph';
  static const heading = 'heading';
  static const partition = 'partition';
  static const code = 'code';
  static const image = 'image';
  static const videoEmbed = 'videoEmbed';
  static const githubRepo = 'githubRepo';
  static const unsplashImage = 'unsplashImage';
  static const table = 'table';
  static const mermaidDiagram = 'mermaidDiagram';

  static const all = [
    paragraph,
    heading,
    partition,
    code,
    image,
    videoEmbed,
    githubRepo,
    unsplashImage,
    table,
    mermaidDiagram,
  ];
}

List<BlogBlock> parseBlogBlocksJson(String contentJson) {
  try {
    final parsed = jsonDecode(contentJson);
    if (parsed is! List) return [];
    return parsed
        .whereType<Map>()
        .map((e) => BlogBlock.fromJson(Map<String, dynamic>.from(e)))
        .where((b) => b.id.isNotEmpty && b.type.isNotEmpty)
        .toList();
  } catch (_) {
    return [];
  }
}
