class UserSummary {
  const UserSummary({
    required this.id,
    required this.email,
    this.fullName,
    this.username,
    this.profileImg,
  });

  final String id;
  final String email;
  final String? fullName;
  final String? username;
  final String? profileImg;

  String get displayName =>
      (fullName?.trim().isNotEmpty == true)
          ? fullName!.trim()
          : (username?.trim().isNotEmpty == true)
          ? username!.trim()
          : email;

  factory UserSummary.fromJson(Map<String, dynamic> json) {
    return UserSummary(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      fullName: json['fullName'] as String?,
      username: json['username'] as String?,
      profileImg: json['profileImg'] as String?,
    );
  }
}
