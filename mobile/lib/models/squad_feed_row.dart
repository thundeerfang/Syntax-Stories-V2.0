import 'blog_feed_post.dart';

class SquadFeedSharedBy {
  const SquadFeedSharedBy({
    required this.userId,
    required this.username,
    this.fullName,
    this.profileImg,
  });

  final String userId;
  final String username;
  final String? fullName;
  final String? profileImg;

  factory SquadFeedSharedBy.fromJson(Map<String, dynamic> json) {
    return SquadFeedSharedBy(
      userId: json['userId']?.toString() ?? '',
      username: (json['username'] as String? ?? '').trim(),
      fullName: json['fullName']?.toString(),
      profileImg: json['profileImg']?.toString(),
    );
  }
}

class SquadFeedRow {
  const SquadFeedRow({
    required this.kind,
    required this.item,
    this.sharedAt,
    this.sharedBy,
    this.pinned = false,
  });

  final String kind;
  final BlogFeedPost item;
  final String? sharedAt;
  final SquadFeedSharedBy? sharedBy;
  final bool pinned;

  bool get isShared => kind == 'shared';

  factory SquadFeedRow.fromJson(Map<String, dynamic> json) {
    final itemRaw = json['item'];
    final sharedRaw = json['sharedBy'];
    return SquadFeedRow(
      kind: json['kind']?.toString() ?? 'authored',
      item: itemRaw is Map<String, dynamic>
          ? BlogFeedPost.fromJson(itemRaw)
          : BlogFeedPost.fromJson(
              itemRaw is Map ? Map<String, dynamic>.from(itemRaw) : const {},
            ),
      sharedAt: json['sharedAt']?.toString(),
      sharedBy: sharedRaw is Map<String, dynamic>
          ? SquadFeedSharedBy.fromJson(sharedRaw)
          : sharedRaw is Map
              ? SquadFeedSharedBy.fromJson(Map<String, dynamic>.from(sharedRaw))
              : null,
      pinned: json['pinned'] == true,
    );
  }
}

class SquadFeedResult {
  const SquadFeedResult({
    required this.feed,
    required this.pinnedCount,
  });

  final List<SquadFeedRow> feed;
  final int pinnedCount;
}
