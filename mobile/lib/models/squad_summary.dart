class SquadMemberPreview {
  const SquadMemberPreview({required this.username, required this.profileImg});

  final String username;
  final String profileImg;

  factory SquadMemberPreview.fromJson(Map<String, dynamic> json) {
    return SquadMemberPreview(
      username: (json['username'] as String? ?? '').trim(),
      profileImg: (json['profileImg'] as String? ?? '').trim(),
    );
  }
}

class SquadSummary {
  const SquadSummary({
    required this.id,
    required this.slug,
    required this.name,
    required this.description,
    required this.visibility,
    required this.postPolicy,
    required this.memberCount,
    this.handle,
    this.iconUrl,
    this.coverBannerUrl,
    this.category,
    this.createdAt,
    this.viewerRole,
    this.memberPreview = const [],
  });

  final String id;
  final String slug;
  final String? handle;
  final String name;
  final String description;
  final String? iconUrl;
  final String? coverBannerUrl;
  final String visibility;
  final String? category;
  final String postPolicy;
  final int memberCount;
  final String? createdAt;
  final String? viewerRole;
  final List<SquadMemberPreview> memberPreview;

  bool get isMember => viewerRole != null && viewerRole!.isNotEmpty;
  bool get isPublic => visibility == 'public';
  bool get isPrivate => visibility == 'private';

  String get displayHandle => (handle?.trim().isNotEmpty == true ? handle! : slug).trim();

  factory SquadSummary.fromJson(Map<String, dynamic> json) {
    final previews = json['memberPreview'];
    return SquadSummary(
      id: (json['_id'] as String? ?? '').trim(),
      slug: (json['slug'] as String? ?? '').trim(),
      handle: json['handle'] as String?,
      name: (json['name'] as String? ?? '').trim(),
      description: (json['description'] as String? ?? '').trim(),
      iconUrl: json['iconUrl'] as String?,
      coverBannerUrl: json['coverBannerUrl'] as String?,
      visibility: (json['visibility'] as String? ?? 'public').trim(),
      category: json['category'] as String?,
      postPolicy: (json['postPolicy'] as String? ?? 'all_members').trim(),
      memberCount: (json['memberCount'] as num?)?.toInt() ?? 0,
      createdAt: json['createdAt'] as String?,
      viewerRole: json['viewerRole'] as String?,
      memberPreview: previews is List
          ? previews
              .whereType<Map>()
              .map((e) => SquadMemberPreview.fromJson(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
    );
  }
}
