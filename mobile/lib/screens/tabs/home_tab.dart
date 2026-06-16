import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../config/home_config.dart';
import '../../models/blog_feed_post.dart';
import '../../models/blog_taxonomy.dart';
import '../../screens/topics/topics_tag_feed_screen.dart';
import '../../screens/topics/topics_hub_screen.dart';
import '../../services/auth_api.dart';
import '../../services/blog_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/blog_navigation.dart';
import '../../widgets/blog/blog_card.dart';
import '../../widgets/blog/blog_card_skeleton.dart';
import '../../widgets/home/home_hero_chips_bar.dart';
import '../../widgets/home/home_hero_swiper.dart';
import '../../widgets/navigation/main_app_bar.dart';
import '../../widgets/ui/app_pull_to_refresh.dart';
import '../../widgets/ui/feed_list_end_marker.dart';

enum _LibraryFilter {
  all,
  categorized,
  category,
}

/// Home tab — hero swiper + library grid (mirrors webapp `HomePageContent`).
class HomeTab extends StatefulWidget {
  const HomeTab({super.key});

  @override
  State<HomeTab> createState() => HomeTabState();
}

class HomeTabState extends State<HomeTab> {
  final _api = BlogApi();

  List<BlogFeedPost> _heroPosts = const [];
  List<BlogFeedPost> _catalogPosts = const [];
  List<BlogTaxonomyRow> _categories = const [];
  List<BlogTaxonomyRow> _hotTags = const [];

  bool _heroLoading = true;
  bool _gridLoading = true;
  bool _tagsLoading = true;
  String? _heroError;
  String? _gridError;

  _LibraryFilter _filter = _LibraryFilter.all;
  String? _categorySlug;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => reload());
  }

  Future<void> reload() async {
    await Future.wait([
      _loadHero(),
      _loadTaxonomy(),
      _loadTags(),
      _loadGrid(),
    ]);
  }

  Future<void> _loadHero() async {
    setState(() {
      _heroLoading = true;
      _heroError = null;
    });
    final token = context.read<AuthState>().accessToken;
    try {
      final page = await _api.fetchPublishedFeed(
        limit: kHomeHeroFeedLimit,
        sort: BlogFeedSort.views,
        accessToken: token,
      );
      if (!mounted) return;
      setState(() {
        _heroPosts = page.posts;
        _heroLoading = false;
      });
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _heroError = e.message;
        _heroLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _heroError = 'Could not load featured stories.';
        _heroLoading = false;
      });
    }
  }

  Future<void> _loadTaxonomy() async {
    try {
      final catalog = await _api.fetchTaxonomy();
      if (!mounted) return;
      final sorted = [...catalog.categories]
        ..sort((a, b) {
          final byCount = b.postCount.compareTo(a.postCount);
          if (byCount != 0) return byCount;
          return a.name.compareTo(b.name);
        });
      setState(() => _categories = sorted);
    } catch (_) {
      if (!mounted) return;
      setState(() => _categories = const []);
    }
  }

  Future<void> _loadTags() async {
    setState(() => _tagsLoading = true);
    try {
      final explore = await _api.fetchTagsExplore();
      if (!mounted) return;
      setState(() {
        _hotTags = mergeHomeHotTags(explore);
        _tagsLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _hotTags = const [];
        _tagsLoading = false;
      });
    }
  }

  Future<void> _loadGrid() async {
    setState(() {
      _gridLoading = true;
      _gridError = null;
    });
    final token = context.read<AuthState>().accessToken;
    try {
      final page = await _api.fetchPublishedFeed(
        limit: kHomeCatalogLimit,
        category: _filter == _LibraryFilter.category ? _categorySlug : null,
        accessToken: token,
      );
      if (!mounted) return;
      setState(() {
        _catalogPosts = page.posts;
        _gridLoading = false;
      });
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _gridError = e.message;
        _gridLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _gridError = 'Could not load stories.';
        _gridLoading = false;
      });
    }
  }

  void _selectFilter(_LibraryFilter filter, {String? categorySlug}) {
    if (_filter == filter && _categorySlug == categorySlug) return;
    setState(() {
      _filter = filter;
      _categorySlug = categorySlug;
    });
    _loadGrid();
  }

  List<BlogFeedPost> get _visibleGridPosts {
    if (_filter == _LibraryFilter.categorized) {
      return _catalogPosts.where((p) => (p.category ?? '').trim().isNotEmpty).toList();
    }
    return _catalogPosts;
  }

  void _openTopics() => TopicsHubScreen.open(context);

  void _openTag(BlogTaxonomyRow tag) {
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => TopicsTagFeedScreen(tag: tag)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final topInset = MainAppBar.totalHeight(context);
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    const navReserve = 96.0;
    final colors = context.appColors;

    return AppPullToRefresh(
      onRefresh: reload,
      edgeOffset: topInset,
      displacement: 40,
      child: CustomScrollView(
        physics: AppPullToRefresh.scrollPhysics,
        slivers: [
          SliverToBoxAdapter(child: SizedBox(height: topInset)),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.only(top: 12),
              child: HomeHeroChipsBar(
                tags: _hotTags,
                loading: _tagsLoading && _hotTags.isEmpty,
                onOpenTopics: _openTopics,
                onOpenTag: _openTag,
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: HomeHeroSwiper(
              posts: _heroPosts,
              loading: _heroLoading && _heroPosts.isEmpty,
              error: _heroError,
              onRetry: _loadHero,
              onOpenPost: (post) => openBlogFeedPost(context, post),
              onBrowseTopics: _openTopics,
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                kHomePageHorizontalPadding,
                16,
                kHomePageHorizontalPadding,
                10,
              ),
              child: Row(
                children: [
                  Icon(Icons.folder_open_outlined, size: 20, color: colors.primary),
                  const SizedBox(width: 8),
                  Text(
                    'LIBRARY',
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.2,
                      color: colors.foreground,
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: kHomePageHorizontalPadding),
                children: [
                  _FilterChip(
                    label: 'All blogs',
                    active: _filter == _LibraryFilter.all,
                    onTap: () => _selectFilter(_LibraryFilter.all),
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'All categories',
                    active: _filter == _LibraryFilter.categorized,
                    onTap: () => _selectFilter(_LibraryFilter.categorized),
                  ),
                  for (final category in _categories) ...[
                    const SizedBox(width: 8),
                    _FilterChip(
                      label: category.name,
                      active: _filter == _LibraryFilter.category && _categorySlug == category.slug,
                      onTap: () => _selectFilter(_LibraryFilter.category, categorySlug: category.slug),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 12)),
          if (_gridLoading && _catalogPosts.isEmpty)
            SliverPadding(
              padding: EdgeInsets.fromLTRB(
                kHomePageHorizontalPadding,
                0,
                kHomePageHorizontalPadding,
                bottomInset + navReserve,
              ),
              sliver: const SliverToBoxAdapter(
                child: BlogCardListSkeleton(count: 4, spacing: 20),
              ),
            )
          else if (_gridError != null && _catalogPosts.isEmpty)
            SliverToBoxAdapter(
              child: _LibraryMessage(
                title: 'Could not load posts',
                message: _gridError!,
                actionLabel: 'Try again',
                onAction: _loadGrid,
              ),
            )
          else if (_visibleGridPosts.isEmpty)
            SliverToBoxAdapter(
              child: _LibraryMessage(
                title: 'No stories yet',
                message: 'Published posts from the community will appear here.',
              ),
            )
          else ...[
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(
                kHomePageHorizontalPadding,
                0,
                kHomePageHorizontalPadding,
                0,
              ),
              sliver: SliverList.separated(
                itemCount: _visibleGridPosts.length,
                separatorBuilder: (_, _) => const SizedBox(height: 20),
                itemBuilder: (context, index) {
                  final post = _visibleGridPosts[index];
                  return BlogCard(
                    post: post,
                    onTap: () => openBlogFeedPost(context, post),
                  );
                },
              ),
            ),
            const SliverToBoxAdapter(
              child: FeedListEndMarker(
                message: "You've reached the end",
                icon: Icons.menu_book_outlined,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;

    return Material(
      color: active ? primary : colors.card,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            border: Border.all(
              color: active ? primary : colors.border,
              width: 2,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: active ? colors.primaryForeground : colors.mutedForeground.withValues(alpha: 0.35),
                  border: Border.all(
                    color: active ? colors.primaryForeground : colors.border,
                    width: 2,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: active ? colors.primaryForeground : colors.foreground,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LibraryMessage extends StatelessWidget {
  const _LibraryMessage({
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
      child: Column(
        children: [
          Text(
            title,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w900,
              color: colors.foreground,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 14, color: colors.mutedForeground),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 12),
            TextButton(onPressed: onAction, child: Text(actionLabel!)),
          ],
        ],
      ),
    );
  }
}
