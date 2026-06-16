enum AchievementCategory {
  engagement,
  profile,
  reading,
  social,
  meta,
}

enum AchievementStatus { locked, inProgress, unlocked }

class AchievementProgressItem {
  const AchievementProgressItem({
    required this.id,
    required this.slug,
    required this.title,
    required this.description,
    required this.category,
    required this.points,
    required this.metric,
    required this.target,
    required this.current,
    required this.unlocked,
    required this.unlockedAt,
    required this.celebrateAs,
    required this.locked,
  });

  factory AchievementProgressItem.fromJson(Map<String, dynamic> json) {
    return AchievementProgressItem(
      id: json['id']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      category: _parseCategory(json['category']),
      points: json['points'] is num ? (json['points'] as num).toInt() : 0,
      metric: json['metric']?.toString() ?? '',
      target: json['target'] is num ? (json['target'] as num).toInt() : 0,
      current: json['current'] is num ? (json['current'] as num).toInt() : 0,
      unlocked: json['unlocked'] == true,
      unlockedAt: json['unlockedAt']?.toString(),
      celebrateAs: json['celebrateAs']?.toString() ?? 'dialog',
      locked: json['locked'] == true,
    );
  }

  final String id;
  final String slug;
  final String title;
  final String description;
  final AchievementCategory category;
  final int points;
  final String metric;
  final int target;
  final int current;
  final bool unlocked;
  final String? unlockedAt;
  final String celebrateAs;
  final bool locked;

  AchievementStatus get status {
    if (unlocked) return AchievementStatus.unlocked;
    if (locked) return AchievementStatus.locked;
    return AchievementStatus.inProgress;
  }

  double get progressPercent {
    if (target <= 0) return 0;
    return (current / target * 100).clamp(0, 100);
  }
}

class AchievementsListResponse {
  const AchievementsListResponse({
    required this.catalogVersion,
    required this.total,
    required this.unlockedCount,
    required this.totalPoints,
    required this.items,
    this.xp,
    this.level,
  });

  factory AchievementsListResponse.fromJson(Map<String, dynamic> json) {
    return AchievementsListResponse(
      catalogVersion: json['catalogVersion'] is num
          ? (json['catalogVersion'] as num).toInt()
          : 0,
      total: json['total'] is num ? (json['total'] as num).toInt() : 0,
      unlockedCount: json['unlockedCount'] is num
          ? (json['unlockedCount'] as num).toInt()
          : 0,
      totalPoints: json['totalPoints'] is num
          ? (json['totalPoints'] as num).toInt()
          : 0,
      xp: json['xp'] is num ? (json['xp'] as num).toInt() : null,
      level: json['level'] is num ? (json['level'] as num).toInt() : null,
      items: _parseAchievementItems(json['items']),
    );
  }

  final int catalogVersion;
  final int total;
  final int unlockedCount;
  final int totalPoints;
  final int? xp;
  final int? level;
  final List<AchievementProgressItem> items;
}

AchievementCategory _parseCategory(Object? raw) {
  final value = raw?.toString() ?? '';
  return AchievementCategory.values.firstWhere(
    (c) => c.name == value,
    orElse: () => AchievementCategory.engagement,
  );
}

List<AchievementProgressItem> _parseAchievementItems(Object? raw) {
  if (raw is! List) return const [];
  final items = <AchievementProgressItem>[];
  for (final row in raw) {
    if (row is! Map) continue;
    items.add(AchievementProgressItem.fromJson(Map<String, dynamic>.from(row)));
  }
  return items;
}
