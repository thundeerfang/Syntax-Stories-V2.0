import 'blog_feed_post.dart';

const int kCommentPageSize = 10;

/// Public blog comment — mirrors webapp `PublicBlogComment`.
class BlogComment {
  const BlogComment({
    required this.id,
    required this.text,
    required this.createdAt,
    required this.author,
    this.authorUserId,
    this.parentId,
    this.likeCount = 0,
    this.likedByViewer = false,
    this.editedAt,
    this.directReplyCount = 0,
  });

  factory BlogComment.fromJson(Map<String, dynamic> json) {
    return BlogComment(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      parentId: json['parentId']?.toString(),
      text: json['text']?.toString() ?? '',
      createdAt: json['createdAt']?.toString() ?? '',
      editedAt: json['editedAt']?.toString(),
      authorUserId: _optionalString(json['authorUserId']),
      likeCount: json['likeCount'] is num ? (json['likeCount'] as num).toInt() : 0,
      likedByViewer: json['likedByViewer'] == true,
      directReplyCount: json['directReplyCount'] is num
          ? (json['directReplyCount'] as num).toInt()
          : 0,
      author: BlogFeedAuthor.fromJson(
        json['author'] is Map<String, dynamic> ? json['author'] as Map<String, dynamic> : null,
      ),
    );
  }

  final String id;
  final String? parentId;
  final String text;
  final String createdAt;
  final String? editedAt;
  final String? authorUserId;
  final int likeCount;
  final bool likedByViewer;
  final int directReplyCount;
  final BlogFeedAuthor author;

  BlogComment copyWith({
    String? text,
    String? editedAt,
    int? likeCount,
    bool? likedByViewer,
    String? authorUserId,
    int? directReplyCount,
  }) {
    return BlogComment(
      id: id,
      parentId: parentId,
      text: text ?? this.text,
      createdAt: createdAt,
      editedAt: editedAt ?? this.editedAt,
      authorUserId: authorUserId ?? this.authorUserId,
      likeCount: likeCount ?? this.likeCount,
      likedByViewer: likedByViewer ?? this.likedByViewer,
      directReplyCount: directReplyCount ?? this.directReplyCount,
      author: author,
    );
  }
}

String? _optionalString(Object? value) {
  if (value == null) return null;
  final s = value.toString().trim();
  return s.isEmpty ? null : s;
}

class BlogCommentsPage {
  const BlogCommentsPage({
    required this.comments,
    required this.total,
    required this.postTotal,
    required this.offset,
    required this.hasMore,
  });

  factory BlogCommentsPage.fromJson(Map<String, dynamic> json) {
    final rows = json['comments'];
    return BlogCommentsPage(
      comments: rows is List
          ? rows
              .whereType<Map<String, dynamic>>()
              .map(BlogComment.fromJson)
              .toList()
          : const [],
      total: json['total'] is num ? (json['total'] as num).toInt() : 0,
      postTotal: json['postTotal'] is num
          ? (json['postTotal'] as num).toInt()
          : json['total'] is num
              ? (json['total'] as num).toInt()
              : 0,
      offset: json['offset'] is num ? (json['offset'] as num).toInt() : 0,
      hasMore: json['hasMore'] == true,
    );
  }

  final List<BlogComment> comments;
  final int total;
  final int postTotal;
  final int offset;
  final bool hasMore;
}
