import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/trending_config.dart';
import '../../models/blog_feed_post.dart';
import '../../models/blog_taxonomy.dart';
import '../../screens/topics/topics_hub_screen.dart';
import '../../services/auth_api.dart';
import '../../services/blog_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/blog_navigation.dart';
import '../../widgets/navigation/main_app_bar.dart';
import '../../widgets/profile/profile_overview_section_card.dart';
import '../../widgets/trending/trending_category_lane.dart';
import '../../widgets/ui/app_loading_indicator.dart';
import '../../widgets/trending/trending_category_lane_skeleton.dart';
import '../../widgets/trending/trending_stacked_hero.dart';
import '../../widgets/ui/app_pull_to_refresh.dart';
import '../../widgets/ui/feed_list_end_marker.dart';

/// Trending tab — stacked hero + category lanes (mirrors web `TrendingPage`).
class TrendingTab extends StatefulWidget {
  const TrendingTab({super.key});

  @override
  State<TrendingTab> createState() => TrendingTabState();
}

class TrendingTabState extends State<TrendingTab> {
  final _api = BlogApi();
  final _scrollController = ScrollController();

  List<BlogFeedPost> _heroPosts = const [];
  List<BlogTaxonomyRow> _categories = const [];
  bool _heroLoading = true;
  bool _categoriesLoading = true;
  bool _categoriesLoadingMore = false;
  bool _categoriesHasMore = false;
  String? _heroError;
  int _categoriesOffset = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => reload());
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController
      ..removeListener(_onScroll)
      ..dispose();
    super.dispose();
  }

  Future<void> reload() async {
    await Future.wait([
      _loadHero(),
      _loadCategories(reset: true),
    ]);
  }

  void _onScroll() {
    if (!_categoriesHasMore || _categoriesLoadingMore || _categoriesLoading) return;
    final max = _scrollController.position.maxScrollExtent;
    if (_scrollController.position.pixels >= max - 280) {
      _loadCategories(reset: false);
    }
  }

  Future<void> _loadHero() async {
    setState(() {
      _heroLoading = true;
      _heroError = null;
    });
    final token = context.read<AuthState>().accessToken;
    try {
      final page = await _api.fetchPublishedFeed(
        limit: kTrendingHeroFeedLimit,
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
        _heroPosts = const [];
        _heroLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _heroError = 'Could not load trending.';
        _heroPosts = const [];
        _heroLoading = false;
      });
    }
  }

  Future<void> _loadCategories({required bool reset}) async {
    if (reset) {
      setState(() {
        _categoriesLoading = true;
        _categoriesOffset = 0;
      });
    } else {
      if (_categoriesLoadingMore) return;
      setState(() => _categoriesLoadingMore = true);
    }

    try {
      final page = await _api.fetchCategoriesPage(
        offset: reset ? 0 : _categoriesOffset,
        limit: kTrendingCategoryPageSize,
        sort: 'posts-desc',
      );
      if (!mounted) return;
      final rows = page.list.where((c) => c.postCount > 0).toList();
      setState(() {
        _categories = reset ? rows : [..._categories, ...rows];
        _categoriesOffset = (reset ? 0 : _categoriesOffset) + page.list.length;
        _categoriesHasMore = page.hasMore;
        _categoriesLoading = false;
        _categoriesLoadingMore = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        if (reset) _categories = const [];
        _categoriesHasMore = false;
        _categoriesLoading = false;
        _categoriesLoadingMore = false;
      });
    }
  }

  void _openTopics() => TopicsHubScreen.open(context);

  @override
  Widget build(BuildContext context) {
    final topInset = MainAppBar.totalHeight(context);
    final colors = context.appColors;

    return AppPullToRefresh(
      onRefresh: reload,
      edgeOffset: topInset,
      displacement: 40,
      child: CustomScrollView(
        controller: _scrollController,
        physics: AppPullToRefresh.scrollPhysics,
        slivers: [
          SliverToBoxAdapter(child: SizedBox(height: topInset)),
          SliverToBoxAdapter(
            child: TrendingStackedHero(
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
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: ProfileOverviewSectionCard(
                title: 'Trending by category',
                icon: Icons.local_fire_department_outlined,
                headerOnly: true,
              ),
            ),
          ),
          if (_categoriesLoading && _categories.isEmpty)
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (_, _) => const TrendingCategoryLaneSkeleton(),
                childCount: 3,
              ),
            )
          else if (_categories.isEmpty)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Text(
                  'No categories with posts yet.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: colors.mutedForeground),
                ),
              ),
            )
          else
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) => TrendingCategoryLane(category: _categories[index]),
                childCount: _categories.length,
              ),
            ),
          if (_categoriesLoadingMore)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: const AppLoadingCenter(),
              ),
            ),
          if (!_categoriesLoading &&
              !_categoriesLoadingMore &&
              !_categoriesHasMore &&
              _categories.isNotEmpty)
            const SliverToBoxAdapter(
              child: FeedListEndMarker(
                message: "You've reached the end",
                icon: Icons.local_fire_department_outlined,
              ),
            ),
        ],
      ),
    );
  }
}
