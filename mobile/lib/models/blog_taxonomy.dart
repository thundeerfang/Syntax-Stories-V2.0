class BlogTaxonomyRow {
  const BlogTaxonomyRow({
    required this.slug,
    required this.name,
    this.postCount = 0,
  });

  factory BlogTaxonomyRow.fromJson(Map<String, dynamic> json) {
    return BlogTaxonomyRow(
      slug: json['slug']?.toString().trim() ?? '',
      name: json['name']?.toString().trim() ?? '',
      postCount: (json['postCount'] as num?)?.toInt() ?? 0,
    );
  }

  final String slug;
  final String name;
  final int postCount;
}

class BlogTaxonomyCatalog {
  const BlogTaxonomyCatalog({
    this.categories = const [],
    this.tags = const [],
  });

  factory BlogTaxonomyCatalog.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const BlogTaxonomyCatalog();
    List<BlogTaxonomyRow> rows(dynamic value) {
      if (value is! List) return const [];
      return value
          .whereType<Map>()
          .map((e) => BlogTaxonomyRow.fromJson(Map<String, dynamic>.from(e)))
          .where((r) => r.slug.isNotEmpty)
          .toList();
    }

    return BlogTaxonomyCatalog(
      categories: rows(json['categories']),
      tags: rows(json['tags']),
    );
  }

  final List<BlogTaxonomyRow> categories;
  final List<BlogTaxonomyRow> tags;
}

class BlogTaxonomyPage {
  const BlogTaxonomyPage({
    this.list = const [],
    this.total = 0,
    this.offset = 0,
    this.limit = 0,
    this.hasMore = false,
  });

  factory BlogTaxonomyPage.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const BlogTaxonomyPage();
    List<BlogTaxonomyRow> rows(dynamic value) {
      if (value is! List) return const [];
      return value
          .whereType<Map>()
          .map((e) => BlogTaxonomyRow.fromJson(Map<String, dynamic>.from(e)))
          .where((r) => r.slug.isNotEmpty)
          .toList();
    }

    return BlogTaxonomyPage(
      list: rows(json['list']),
      total: (json['total'] as num?)?.toInt() ?? 0,
      offset: (json['offset'] as num?)?.toInt() ?? 0,
      limit: (json['limit'] as num?)?.toInt() ?? 0,
      hasMore: json['hasMore'] == true,
    );
  }

  final List<BlogTaxonomyRow> list;
  final int total;
  final int offset;
  final int limit;
  final bool hasMore;
}

class BlogTagsExplore {
  const BlogTagsExplore({
    this.trending = const [],
    this.popular = const [],
    this.recent = const [],
  });

  factory BlogTagsExplore.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const BlogTagsExplore();
    List<BlogTaxonomyRow> rows(dynamic value) {
      if (value is! List) return const [];
      return value
          .whereType<Map>()
          .map((e) => BlogTaxonomyRow.fromJson(Map<String, dynamic>.from(e)))
          .where((r) => r.slug.isNotEmpty)
          .toList();
    }

    return BlogTagsExplore(
      trending: rows(json['trending']),
      popular: rows(json['popular']),
      recent: rows(json['recent']),
    );
  }

  final List<BlogTaxonomyRow> trending;
  final List<BlogTaxonomyRow> popular;
  final List<BlogTaxonomyRow> recent;
}
