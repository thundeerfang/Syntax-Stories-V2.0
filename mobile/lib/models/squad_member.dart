class SquadMember {
  const SquadMember({
    required this.userId,
    required this.username,
    required this.fullName,
    required this.profileImg,
    required this.role,
    this.joinedAt,
  });

  final String userId;
  final String username;
  final String fullName;
  final String profileImg;
  final String role;
  final String? joinedAt;

  bool get isAdmin => role == 'admin';
  bool get isModerator => role == 'moderator';
  bool get isStaff => isAdmin || isModerator;

  factory SquadMember.fromJson(Map<String, dynamic> json) {
    return SquadMember(
      userId: json['userId']?.toString() ?? '',
      username: (json['username'] as String? ?? '').trim(),
      fullName: (json['fullName'] as String? ?? '').trim(),
      profileImg: (json['profileImg'] as String? ?? '').trim(),
      role: (json['role'] as String? ?? 'member').trim(),
      joinedAt: json['joinedAt']?.toString(),
    );
  }
}
