import 'blog_feed_post.dart';

class BlogPostEditor {
  const BlogPostEditor({
    required this.username,
    required this.fullName,
  });

  factory BlogPostEditor.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return const BlogPostEditor(username: '', fullName: '');
    }
    return BlogPostEditor(
      username: json['username']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? '',
    );
  }

  final String username;
  final String fullName;
}

/// Full published post — mirrors webapp `PublicBlogPostDetail`.
class BlogPostDetail {
  const BlogPostDetail({
    required this.id,
    required this.title,
    required this.slug,
    required this.summary,
    required this.content,
    required this.author,
    required this.publishedAt,
    required this.createdAt,
    required this.updatedAt,
    this.thumbnailUrl,
    this.category,
    this.tags = const [],
    this.readTimeMinutes,
    this.lastEditedAt,
    this.lastEditedBy,
    this.respectCount = 0,
    this.repostCount = 0,
    this.bookmarkCount = 0,
    this.commentCount = 0,
    this.viewCount = 0,
    this.viewerHasRespected = false,
    this.viewerHasReposted = false,
    this.viewerHasBookmarked = false,
  });

  factory BlogPostDetail.fromJson(Map<String, dynamic> json) {
    final tagsRaw = json['tags'];
    final tags = tagsRaw is List
        ? tagsRaw.map((t) => t.toString()).where((t) => t.isNotEmpty).toList()
        : <String>[];

    final published = json['publishedAt']?.toString() ??
        json['updatedAt']?.toString() ??
        json['createdAt']?.toString() ??
        '';

    return BlogPostDetail(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      summary: json['summary']?.toString() ?? '',
      content: json['content']?.toString() ?? '',
      thumbnailUrl: json['thumbnailUrl']?.toString(),
      publishedAt: published,
      createdAt: json['createdAt']?.toString() ?? published,
      updatedAt: json['updatedAt']?.toString() ?? published,
      lastEditedAt: json['lastEditedAt']?.toString(),
      lastEditedBy: json['lastEditedBy'] is Map<String, dynamic>
          ? BlogPostEditor.fromJson(json['lastEditedBy'] as Map<String, dynamic>)
          : null,
      author: BlogFeedAuthor.fromJson(
        json['author'] is Map<String, dynamic> ? json['author'] as Map<String, dynamic> : null,
      ),
      category: json['category']?.toString(),
      tags: tags,
      readTimeMinutes: json['readTimeMinutes'] is num
          ? (json['readTimeMinutes'] as num).toInt()
          : null,
      respectCount: _asInt(json['respectCount']),
      repostCount: _asInt(json['repostCount']),
      bookmarkCount: _asInt(json['bookmarkCount']),
      commentCount: _asInt(json['commentCount']),
      viewCount: _asInt(json['viewCount']),
      viewerHasRespected: json['viewerHasRespected'] == true,
      viewerHasReposted: json['viewerHasReposted'] == true,
      viewerHasBookmarked: json['viewerHasBookmarked'] == true,
    );
  }

  factory BlogPostDetail.fromFeedPreview(BlogFeedPost preview) {
    return BlogPostDetail(
      id: preview.id,
      title: preview.title,
      slug: preview.slug,
      summary: preview.summary,
      content: '',
      author: preview.author,
      publishedAt: preview.publishedAt,
      createdAt: preview.publishedAt,
      updatedAt: preview.publishedAt,
      thumbnailUrl: preview.thumbnailUrl,
      category: preview.category,
      tags: preview.tags,
      readTimeMinutes: preview.readTimeMinutes,
      respectCount: preview.respectCount,
      repostCount: preview.repostCount,
      bookmarkCount: preview.bookmarkCount,
      commentCount: preview.commentCount,
      viewCount: preview.viewCount,
      viewerHasRespected: preview.viewerHasRespected,
      viewerHasReposted: preview.viewerHasReposted,
      viewerHasBookmarked: preview.viewerHasBookmarked,
    );
  }

  final String id;
  final String title;
  final String slug;
  final String summary;
  final String content;
  final String? thumbnailUrl;
  final String publishedAt;
  final String createdAt;
  final String updatedAt;
  final BlogFeedAuthor author;
  final String? category;
  final List<String> tags;
  final int? readTimeMinutes;
  final String? lastEditedAt;
  final BlogPostEditor? lastEditedBy;
  final int respectCount;
  final int repostCount;
  final int bookmarkCount;
  final int commentCount;
  final int viewCount;
  final bool viewerHasRespected;
  final bool viewerHasReposted;
  final bool viewerHasBookmarked;

  BlogPostDetail copyWith({
    String? content,
    int? respectCount,
    int? repostCount,
    int? bookmarkCount,
    int? commentCount,
    int? viewCount,
    bool? viewerHasRespected,
    bool? viewerHasReposted,
    bool? viewerHasBookmarked,
  }) {
    return BlogPostDetail(
      id: id,
      title: title,
      slug: slug,
      summary: summary,
      content: content ?? this.content,
      author: author,
      publishedAt: publishedAt,
      createdAt: createdAt,
      updatedAt: updatedAt,
      thumbnailUrl: thumbnailUrl,
      category: category,
      tags: tags,
      readTimeMinutes: readTimeMinutes,
      lastEditedAt: lastEditedAt,
      lastEditedBy: lastEditedBy,
      respectCount: respectCount ?? this.respectCount,
      repostCount: repostCount ?? this.repostCount,
      bookmarkCount: bookmarkCount ?? this.bookmarkCount,
      commentCount: commentCount ?? this.commentCount,
      viewCount: viewCount ?? this.viewCount,
      viewerHasRespected: viewerHasRespected ?? this.viewerHasRespected,
      viewerHasReposted: viewerHasReposted ?? this.viewerHasReposted,
      viewerHasBookmarked: viewerHasBookmarked ?? this.viewerHasBookmarked,
    );
  }

  BlogFeedPost toFeedPost() {
    return BlogFeedPost(
      id: id,
      title: title,
      slug: slug,
      summary: summary,
      author: author,
      publishedAt: publishedAt,
      thumbnailUrl: thumbnailUrl,
      category: category,
      tags: tags,
      readTimeMinutes: readTimeMinutes,
      respectCount: respectCount,
      repostCount: repostCount,
      bookmarkCount: bookmarkCount,
      commentCount: commentCount,
      viewCount: viewCount,
      viewerHasRespected: viewerHasRespected,
      viewerHasReposted: viewerHasReposted,
      viewerHasBookmarked: viewerHasBookmarked,
    );
  }

  static int _asInt(dynamic value) {
    if (value is num) return value.toInt();
    return 0;
  }
}
