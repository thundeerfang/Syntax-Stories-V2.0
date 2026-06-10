/// Unified navbar search — mirrors `webapp/src/contracts/searchApi.ts`.
enum SearchEntityType { user, tag, category, squad, blog, feature }

enum SearchGroupKey { users, tags, categories, squads, blogs, features }

const searchMinChars = 3;
const searchDebounceMs = 200;
const searchDefaultLimit = 8;

/// Mobile search excludes local-only `features` group.
const mobileSearchTypes = [
  SearchGroupKey.users,
  SearchGroupKey.tags,
  SearchGroupKey.categories,
  SearchGroupKey.squads,
  SearchGroupKey.blogs,
];

const searchGroupOrder = [
  SearchGroupKey.blogs,
  SearchGroupKey.tags,
  SearchGroupKey.categories,
  SearchGroupKey.squads,
  SearchGroupKey.users,
];

const searchGroupLabels = {
  SearchGroupKey.users: 'People',
  SearchGroupKey.tags: 'Tags',
  SearchGroupKey.categories: 'Categories',
  SearchGroupKey.squads: 'Squads',
  SearchGroupKey.blogs: 'Posts',
  SearchGroupKey.features: 'Features',
};

class SearchHit {
  const SearchHit({
    required this.id,
    required this.type,
    required this.label,
    required this.href,
    this.sublabel,
    this.imageUrl,
    this.postCount,
    this.memberCount,
  });

  final String id;
  final SearchEntityType type;
  final String label;
  final String href;
  final String? sublabel;
  final String? imageUrl;
  final int? postCount;
  final int? memberCount;

  factory SearchHit.fromJson(Map<String, dynamic> json) {
    return SearchHit(
      id: json['id']?.toString() ?? '',
      type: _parseEntityType(json['type']?.toString()),
      label: json['label']?.toString() ?? '',
      href: json['href']?.toString() ?? '',
      sublabel: json['sublabel']?.toString(),
      imageUrl: json['imageUrl']?.toString(),
      postCount: _parseInt(json['meta'] is Map ? (json['meta'] as Map)['postCount'] : null),
      memberCount: _parseInt(json['meta'] is Map ? (json['meta'] as Map)['memberCount'] : null),
    );
  }

  static SearchEntityType _parseEntityType(String? raw) {
    return switch (raw) {
      'user' => SearchEntityType.user,
      'tag' => SearchEntityType.tag,
      'category' => SearchEntityType.category,
      'squad' => SearchEntityType.squad,
      'blog' => SearchEntityType.blog,
      'feature' => SearchEntityType.feature,
      _ => SearchEntityType.blog,
    };
  }

  static int? _parseInt(Object? value) {
    if (value == null) return null;
    if (value is int) return value;
    return int.tryParse(value.toString());
  }

  String get displayLabel {
    if (type == SearchEntityType.tag) {
      final text = label.replaceFirst(RegExp(r'^#'), '');
      return '#$text';
    }
    return label;
  }
}

typedef SearchGroups = Map<SearchGroupKey, List<SearchHit>>;

class UnifiedSearchResult {
  const UnifiedSearchResult({
    required this.q,
    required this.minChars,
    required this.groups,
    this.tookMs,
    this.cached = false,
  });

  final String q;
  final int minChars;
  final SearchGroups groups;
  final int? tookMs;
  final bool cached;

  int get matchCount {
    var n = 0;
    for (final key in searchGroupOrder) {
      n += groups[key]?.length ?? 0;
    }
    return n;
  }

  List<(SearchGroupKey, List<SearchHit>)> get groupedEntries {
    final out = <(SearchGroupKey, List<SearchHit>)>[];
    for (final key in searchGroupOrder) {
      final hits = groups[key];
      if (hits != null && hits.isNotEmpty) out.add((key, hits));
    }
    return out;
  }
}
