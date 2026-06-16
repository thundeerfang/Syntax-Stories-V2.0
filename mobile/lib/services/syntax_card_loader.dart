import '../config/web_config.dart';
import '../models/public_profile_result.dart';
import '../models/syntax_card_data.dart';
import '../models/squad_summary.dart';
import '../utils/profile_display.dart';
import 'blog_api.dart';
import 'follow_api.dart';
import 'squad_api.dart';

const _maxCategoryChips = 5;
const _maxSquadLogos = 5;

/// Loads Syntax Card data — mirrors webapp `SyntaxCardPanel.loadCardData`.
class SyntaxCardLoader {
  SyntaxCardLoader({
    FollowApi? followApi,
    BlogApi? blogApi,
    SquadApi? squadApi,
  })  : _followApi = followApi ?? FollowApi(),
        _blogApi = blogApi ?? BlogApi(),
        _squadApi = squadApi ?? SquadApi();

  final FollowApi _followApi;
  final BlogApi _blogApi;
  final SquadApi _squadApi;

  Future<SyntaxCardData> load({
    required String username,
    required String fullName,
    String? profileImg,
    String? coverBanner,
    String? accessToken,
  }) async {
    final slug = username.trim();
    if (slug.isEmpty) {
      return SyntaxCardData(fullName: fullName, username: slug);
    }

    final profileUrl = '${resolveWebBaseUrl()}/u/$slug';
    final token = accessToken?.trim() ?? '';

    PublicProfileResult? profile;
    var postsCount = 0;
    var postsCapped = false;
    var respectsCount = 0;
    var followersCount = 0;
    var joinedLabel = '';
    List<SyntaxCardSquadPreview> squads = const [];
    List<String> categoryNames = const [];

    try {
      profile = await _followApi.getPublicProfile(slug);
      respectsCount = profile.blogRespectReceivedCount;
      followersCount = profile.followersCount;
      joinedLabel = formatJoinedDate(profile.user.createdAt);
    } catch (_) {}

    try {
      final posts = await _blogApi.getUserPublishedPosts(
        username: slug,
        limit: 50,
        accessToken: token.isNotEmpty ? token : null,
      );
      postsCount = posts.length;
      postsCapped = posts.length >= 50;
    } catch (_) {}

    if (token.isNotEmpty) {
      try {
        final mine = await _squadApi.listMine(bearer: token);
        squads = mine.squads.take(_maxSquadLogos).map(_mapSquad).toList();
      } catch (_) {}

      try {
        categoryNames = await _loadFollowedCategoryNames(token);
      } catch (_) {}
    }

    final resolvedName = profile?.user.displayName.trim().isNotEmpty == true
        ? profile!.user.displayName
        : fullName.trim().isNotEmpty
            ? fullName.trim()
            : slug;

    return SyntaxCardData(
      fullName: resolvedName,
      username: slug,
      profileImg: profileImg ?? profile?.user.profileImg,
      coverBanner: coverBanner ?? profile?.user.coverBanner,
      postsCount: postsCount,
      postsCapped: postsCapped,
      respectsCount: respectsCount,
      followersCount: followersCount,
      squads: squads,
      categoryNames: categoryNames,
      joinedLabel: joinedLabel,
      profileUrl: profileUrl,
    );
  }

  SyntaxCardSquadPreview _mapSquad(SquadSummary squad) {
    return SyntaxCardSquadPreview(
      slug: squad.slug,
      name: squad.name,
      iconUrl: squad.iconUrl,
    );
  }

  Future<List<String>> _loadFollowedCategoryNames(String token) async {
    final slugs = await _blogApi.listFollowedCategories(accessToken: token);
    if (slugs.isEmpty) return const [];

    final taxonomy = await _blogApi.fetchTaxonomy();
    final bySlug = <String, String>{
      for (final row in taxonomy.categories)
        row.slug.toLowerCase(): row.name,
    };

    return slugs
        .take(_maxCategoryChips)
        .map((slug) => bySlug[slug.toLowerCase()] ?? slug)
        .where((name) => name.trim().isNotEmpty)
        .toList();
  }
}
