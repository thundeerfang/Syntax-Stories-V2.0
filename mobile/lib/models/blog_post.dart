class BlogPost {
  const BlogPost({
    required this.id,
    required this.title,
    required this.slug,
    this.summary,
    this.content = '',
    this.thumbnailUrl,
    this.status = 'draft',
    this.category,
    this.tags = const [],
    this.language,
  });

  factory BlogPost.fromJson(Map<String, dynamic> json) {
    final rawTags = json['tags'];
    final tags = rawTags is List
        ? rawTags.map((t) => t.toString().trim()).where((t) => t.isNotEmpty).toList()
        : <String>[];

    return BlogPost(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title: json['title']?.toString().trim() ?? '',
      slug: json['slug']?.toString().trim() ?? '',
      summary: json['summary']?.toString().trim(),
      content: json['content']?.toString() ?? '',
      thumbnailUrl: json['thumbnailUrl']?.toString().trim(),
      status: json['status']?.toString() ?? 'draft',
      category: json['category']?.toString().trim(),
      tags: tags,
      language: json['language']?.toString().trim(),
    );
  }

  final String id;
  final String title;
  final String slug;
  final String? summary;
  final String content;
  final String? thumbnailUrl;
  final String status;
  final String? category;
  final List<String> tags;
  final String? language;

  bool get isPublished => status == 'published';
}
