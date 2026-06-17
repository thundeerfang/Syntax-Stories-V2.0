import 'user_summary.dart';

class PublicProfileResult {
  const PublicProfileResult({
    required this.user,
    required this.followersCount,
    required this.followingCount,
    this.blogRespectReceivedCount = 0,
    this.blogRepostCount = 0,
  });

  final UserSummary user;
  final int followersCount;
  final int followingCount;
  final int blogRespectReceivedCount;
  final int blogRepostCount;

  factory PublicProfileResult.fromJson(Map<String, dynamic> json) {
    final userRaw = json['user'];
    final userMap = userRaw is Map
        ? Map<String, dynamic>.from(userRaw)
        : <String, dynamic>{};

    if (userMap['id'] != null && userMap['_id'] == null) {
      userMap['_id'] = userMap['id'];
    }
    if (!userMap.containsKey('email')) {
      userMap['email'] = '';
    }

    return PublicProfileResult(
      user: UserSummary.fromJson(userMap),
      followersCount: _intVal(json['followersCount']),
      followingCount: _intVal(json['followingCount']),
      blogRespectReceivedCount: _intVal(json['blogRespectReceivedCount']),
      blogRepostCount: _intVal(json['blogRepostCount']),
    );
  }

  static int _intVal(dynamic value) {
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }
}
