class TechStackItem {
  const TechStackItem({
    required this.name,
    required this.slug,
    required this.category,
    this.iconSlug = '',
    this.iconUrl = '',
  });

  factory TechStackItem.fromJson(Map<String, dynamic> json) {
    return TechStackItem(
      name: json['name']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      iconSlug: json['iconSlug']?.toString() ?? '',
      iconUrl: json['iconUrl']?.toString() ?? '',
    );
  }

  final String name;
  final String slug;
  final String category;
  final String iconSlug;
  final String iconUrl;
}
