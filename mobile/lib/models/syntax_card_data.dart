class SyntaxCardSquadPreview {
  const SyntaxCardSquadPreview({
    required this.slug,
    required this.name,
    this.iconUrl,
  });

  final String slug;
  final String name;
  final String? iconUrl;
}

class SyntaxCardData {
  const SyntaxCardData({
    required this.fullName,
    required this.username,
    this.profileImg,
    this.coverBanner,
    this.postsCount = 0,
    this.postsCapped = false,
    this.respectsCount = 0,
    this.followersCount = 0,
    this.squads = const [],
    this.categoryNames = const [],
    this.joinedLabel = '',
    this.profileUrl = '',
  });

  final String fullName;
  final String username;
  final String? profileImg;
  final String? coverBanner;
  final int postsCount;
  final bool postsCapped;
  final int respectsCount;
  final int followersCount;
  final List<SyntaxCardSquadPreview> squads;
  final List<String> categoryNames;
  final String joinedLabel;
  final String profileUrl;

  String get postsDisplay {
    if (postsCapped && postsCount >= 50) return '$postsCount+';
    return '$postsCount';
  }
}
