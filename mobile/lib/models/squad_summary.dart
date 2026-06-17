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
    this.viewerIsStaff = false,
    this.viewerNeedsInvite = false,
    this.postCount = 0,
    this.viewCount = 0,
    this.creatorUserId,
    this.inviteToken,
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
  final int postCount;
  final int viewCount;
  final String? createdAt;
  final String? viewerRole;
  final bool viewerIsStaff;
  final bool viewerNeedsInvite;
  final String? creatorUserId;
  final String? inviteToken;
  final List<SquadMemberPreview> memberPreview;

  bool get isMember => viewerRole != null && viewerRole!.isNotEmpty;
  bool get isAdmin => viewerRole == 'admin';
  bool get isPublic => visibility == 'public';
  bool get isPrivate => visibility == 'private';

  bool get feedVisible =>
      viewerNeedsInvite != true && !(isPrivate && !isMember);

  String get displayHandle => (handle?.trim().isNotEmpty == true ? handle! : slug).trim();

  /// Rebuilds with safe defaults — handles list previews and hot-reload stale instances.
  SquadSummary withResolvedFields() {
    final dyn = this as dynamic;
    return SquadSummary(
      id: id,
      slug: slug,
      handle: handle,
      name: name,
      description: description,
      iconUrl: iconUrl,
      coverBannerUrl: coverBannerUrl,
      visibility: visibility,
      category: category,
      postPolicy: postPolicy,
      memberCount: memberCount,
      createdAt: createdAt,
      viewerRole: viewerRole,
      viewerIsStaff: dyn.viewerIsStaff == true,
      viewerNeedsInvite: dyn.viewerNeedsInvite == true,
      postCount: _asInt(dyn.postCount),
      viewCount: _asInt(dyn.viewCount),
      creatorUserId: dyn.creatorUserId?.toString(),
      inviteToken: dyn.inviteToken?.toString(),
      memberPreview: memberPreview,
    );
  }

  static int _asInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return 0;
  }

  factory SquadSummary.fromJson(Map<String, dynamic> json) {
    final previews = json['memberPreview'];
    return SquadSummary(
      id: (json['_id']?.toString() ?? json['id']?.toString() ?? '').trim(),
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
      postCount: (json['postCount'] as num?)?.toInt() ?? 0,
      viewCount: (json['viewCount'] as num?)?.toInt() ?? 0,
      createdAt: json['createdAt'] as String?,
      viewerRole: json['viewerRole'] as String?,
      viewerIsStaff: json['viewerIsStaff'] == true,
      viewerNeedsInvite: json['viewerNeedsInvite'] == true,
      creatorUserId: json['creatorUserId']?.toString(),
      inviteToken: json['inviteToken']?.toString(),
      memberPreview: previews is List
          ? previews
              .whereType<Map>()
              .map((e) => SquadMemberPreview.fromJson(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
    );
  }
}
