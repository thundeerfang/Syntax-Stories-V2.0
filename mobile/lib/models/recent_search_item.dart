import 'search_hit.dart';

/// A persisted search history row — query text or a tapped result.
sealed class RecentSearchItem {
  const RecentSearchItem({required this.savedAtMs});

  final int savedAtMs;

  String get dedupeKey;
}

class RecentSearchQuery extends RecentSearchItem {
  const RecentSearchQuery({
    required this.query,
    required super.savedAtMs,
  });

  final String query;

  @override
  String get dedupeKey => 'q:${query.toLowerCase()}';

  Map<String, dynamic> toJson() => {
        'kind': 'query',
        'query': query,
        'savedAtMs': savedAtMs,
      };

  factory RecentSearchQuery.fromJson(Map<String, dynamic> json) {
    return RecentSearchQuery(
      query: json['query']?.toString() ?? '',
      savedAtMs: (json['savedAtMs'] as num?)?.toInt() ?? 0,
    );
  }
}

class RecentSearchHitEntry extends RecentSearchItem {
  const RecentSearchHitEntry({
    required this.hit,
    required super.savedAtMs,
  });

  final SearchHit hit;

  @override
  String get dedupeKey => 'hit:${hit.type.name}:${hit.id}';

  Map<String, dynamic> toJson() => {
        'kind': 'hit',
        'hit': {
          'id': hit.id,
          'type': hit.type.name,
          'label': hit.label,
          'href': hit.href,
          if (hit.sublabel != null) 'sublabel': hit.sublabel,
          if (hit.imageUrl != null) 'imageUrl': hit.imageUrl,
        },
        'savedAtMs': savedAtMs,
      };

  factory RecentSearchHitEntry.fromJson(Map<String, dynamic> json) {
    final rawHit = json['hit'];
    final hitMap = rawHit is Map ? Map<String, dynamic>.from(rawHit) : <String, dynamic>{};
    return RecentSearchHitEntry(
      hit: SearchHit.fromJson(hitMap),
      savedAtMs: (json['savedAtMs'] as num?)?.toInt() ?? 0,
    );
  }
}

RecentSearchItem? recentSearchItemFromJson(Map<String, dynamic> json) {
  final kind = json['kind']?.toString();
  return switch (kind) {
    'query' => RecentSearchQuery.fromJson(json),
    'hit' => RecentSearchHitEntry.fromJson(json),
    _ => null,
  };
}
