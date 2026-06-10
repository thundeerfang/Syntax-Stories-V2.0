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
