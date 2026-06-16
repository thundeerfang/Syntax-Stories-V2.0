class CategoryMemberPreview {
  const CategoryMemberPreview({
    required this.username,
    this.profileImg = '',
  });

  factory CategoryMemberPreview.fromJson(Map<String, dynamic> json) {
    return CategoryMemberPreview(
      username: json['username']?.toString().trim() ?? '',
      profileImg: json['profileImg']?.toString() ?? '',
    );
  }

  final String username;
  final String profileImg;
}

class CategoryMembersSnapshot {
  const CategoryMembersSnapshot({
    this.members = const [],
    this.totalCount = 0,
  });

  factory CategoryMembersSnapshot.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const CategoryMembersSnapshot();
    final raw = json['members'];
    final members = raw is List
        ? raw
            .whereType<Map>()
            .map((e) => CategoryMemberPreview.fromJson(Map<String, dynamic>.from(e)))
            .where((m) => m.username.isNotEmpty)
            .toList()
        : const <CategoryMemberPreview>[];
    return CategoryMembersSnapshot(
      members: members,
      totalCount: (json['totalCount'] as num?)?.toInt() ?? members.length,
    );
  }

  final List<CategoryMemberPreview> members;
  final int totalCount;
}
