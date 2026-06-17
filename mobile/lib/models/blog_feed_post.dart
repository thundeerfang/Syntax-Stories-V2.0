class BlogFeedAuthor {
  const BlogFeedAuthor({
    required this.username,
    required this.fullName,
    this.profileImg = '',
  });

  factory BlogFeedAuthor.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return const BlogFeedAuthor(username: '', fullName: 'Author');
    }
    return BlogFeedAuthor(
      username: json['username']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? '',
      profileImg: json['profileImg']?.toString() ?? '',
    );
  }

  final String username;
  final String fullName;
  final String profileImg;
}

/// Public feed row — mirrors webapp `PublicFeedPost`.
class BlogFeedPost {
  const BlogFeedPost({
    required this.id,
    required this.title,
    required this.slug,
    required this.summary,
    required this.author,
    required this.publishedAt,
    this.thumbnailUrl,
    this.category,
    this.tags = const [],
    this.readTimeMinutes,
    this.respectCount = 0,
    this.repostCount = 0,
    this.bookmarkCount = 0,
    this.commentCount = 0,
    this.viewCount = 0,
    this.viewerHasRespected = false,
    this.viewerHasReposted = false,
    this.viewerHasBookmarked = false,
  });

  factory BlogFeedPost.fromJson(Map<String, dynamic> json) {
    final tagsRaw = json['tags'];
    final tags = tagsRaw is List
        ? tagsRaw.map((t) => t.toString()).where((t) => t.isNotEmpty).toList()
        : <String>[];

    final published = json['publishedAt']?.toString() ??
        json['updatedAt']?.toString() ??
        json['createdAt']?.toString() ??
        '';

    return BlogFeedPost(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      summary: json['summary']?.toString() ?? '',
      thumbnailUrl: json['thumbnailUrl']?.toString(),
      publishedAt: published,
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

  final String id;
  final String title;
  final String slug;
  final String summary;
  final String? thumbnailUrl;
  final String publishedAt;
  final BlogFeedAuthor author;
  final String? category;
  final List<String> tags;
  final int? readTimeMinutes;
  final int respectCount;
  final int repostCount;
  final int bookmarkCount;
  final int commentCount;
  final int viewCount;
  final bool viewerHasRespected;
  final bool viewerHasReposted;
  final bool viewerHasBookmarked;

  String get postPath {
    final user = author.username.trim();
    if (user.isEmpty) return '/blogs/$slug';
    return '/blogs/$user/$slug';
  }

  static int _asInt(dynamic value) {
    if (value is num) return value.toInt();
    return 0;
  }

  BlogFeedPost copyWith({
    String? id,
    String? title,
    String? slug,
    String? summary,
    String? thumbnailUrl,
    String? publishedAt,
    BlogFeedAuthor? author,
    String? category,
    List<String>? tags,
    int? readTimeMinutes,
    int? respectCount,
    int? repostCount,
    int? bookmarkCount,
    int? commentCount,
    int? viewCount,
    bool? viewerHasRespected,
    bool? viewerHasReposted,
    bool? viewerHasBookmarked,
  }) {
    return BlogFeedPost(
      id: id ?? this.id,
      title: title ?? this.title,
      slug: slug ?? this.slug,
      summary: summary ?? this.summary,
      author: author ?? this.author,
      publishedAt: publishedAt ?? this.publishedAt,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      category: category ?? this.category,
      tags: tags ?? this.tags,
      readTimeMinutes: readTimeMinutes ?? this.readTimeMinutes,
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
}

class BlogFeedPage {
  const BlogFeedPage({
    required this.posts,
    required this.hasMore,
  });

  factory BlogFeedPage.fromJson(Map<String, dynamic> json) {
    final rows = json['posts'];
    return BlogFeedPage(
      posts: rows is List
          ? rows
              .whereType<Map<String, dynamic>>()
              .map(BlogFeedPost.fromJson)
              .toList()
          : const [],
      hasMore: json['hasMore'] == true,
    );
  }

  final List<BlogFeedPost> posts;
  final bool hasMore;
}

enum BlogFeedSort { recent, views }
