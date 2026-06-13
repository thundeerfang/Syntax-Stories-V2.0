class FollowUser {
  const FollowUser({
    required this.id,
    required this.username,
    required this.fullName,
    this.profileImg,
    this.followedAt,
  });

  final String id;
  final String username;
  final String fullName;
  final String? profileImg;
  final String? followedAt;

  factory FollowUser.fromJson(Map<String, dynamic> json) {
    return FollowUser(
      id: json['id']?.toString() ?? '',
      username: json['username']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? '',
      profileImg: json['profileImg']?.toString(),
      followedAt: json['followedAt']?.toString(),
    );
  }
}

enum FollowListKind { followers, following }
