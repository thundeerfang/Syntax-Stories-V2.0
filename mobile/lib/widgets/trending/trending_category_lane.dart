import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/trending_config.dart';
import '../../models/blog_feed_post.dart';
import '../../models/blog_taxonomy.dart';
import '../../services/auth_api.dart';
import '../../services/blog_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/blog_navigation.dart';
import '../../utils/taxonomy_navigation.dart';
import '../blog/blog_card.dart';
import '../blog/blog_card_skeleton.dart';
import 'trending_section_header.dart';
import '../ui/app_loading_indicator.dart';

class TrendingCategoryLane extends StatefulWidget {
  const TrendingCategoryLane({
    super.key,
    required this.category,
    this.embeddedInCard = false,
  });

  final BlogTaxonomyRow category;
  final bool embeddedInCard;

  @override
  State<TrendingCategoryLane> createState() => _TrendingCategoryLaneState();
}

class _TrendingCategoryLaneState extends State<TrendingCategoryLane> {
  final _api = BlogApi();
  final _scrollController = ScrollController();

  List<BlogFeedPost> _posts = const [];
  bool _loading = true;
  bool _loadingMore = false;
  bool _hasMore = false;
  String? _error;
  int _offset = 0;

  @override
  void initState() {
    super.initState();
    _load(reset: true);
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController
      ..removeListener(_onScroll)
      ..dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_hasMore || _loadingMore || _loading) return;
    final max = _scrollController.position.maxScrollExtent;
    if (_scrollController.position.pixels >= max - 120) {
      _load(reset: false);
    }
  }

  Future<void> _load({required bool reset}) async {
    if (reset) {
      setState(() {
        _loading = true;
        _error = null;
        _offset = 0;
      });
    } else {
      if (_loadingMore) return;
      setState(() => _loadingMore = true);
    }

    final token = context.read<AuthState>().accessToken;
    final limit = reset ? kTrendingLaneInitialPosts : kTrendingLanePostsPage;

    try {
      final page = await _api.fetchPublishedFeed(
        limit: limit,
        offset: reset ? 0 : _offset,
        category: widget.category.slug,
        accessToken: token,
      );
      if (!mounted) return;
      setState(() {
        _posts = reset ? page.posts : [..._posts, ...page.posts];
        _offset = (reset ? 0 : _offset) + page.posts.length;
        _hasMore = page.hasMore;
        _loading = false;
        _loadingMore = false;
      });
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        if (reset) _posts = const [];
        _loading = false;
        _loadingMore = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load stories.';
        if (reset) _posts = const [];
        _loading = false;
        _loadingMore = false;
      });
    }
  }

  void _openViewAll() {
    openCategoryFeed(context, widget.category);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final count = widget.category.postCount;
    final edgePad = widget.embeddedInCard ? 0.0 : 16.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TrendingSectionHeader(
          title: widget.category.name,
          postCount: count > 0 ? count : null,
          onViewAll: _openViewAll,
          viewAllLabel: 'VIEW LANE',
          horizontalPadding: edgePad,
        ),
        SizedBox(
          height: kBlogCardLaneHeight,
          child: _buildBody(colors, horizontalPadding: edgePad),
        ),
        SizedBox(height: widget.embeddedInCard ? 4 : 8),
      ],
    );
  }

  Widget _buildBody(AppColorTokens colors, {required double horizontalPadding}) {
    if (_loading) {
      return ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
        itemCount: 2,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (_, _) => SizedBox(
          width: kBlogCardLaneWidth,
          height: kBlogCardLaneHeight,
          child: const BlogCardSkeleton(),
        ),
      );
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(_error!, textAlign: TextAlign.center, style: TextStyle(color: colors.mutedForeground)),
              TextButton(onPressed: () => _load(reset: true), child: const Text('Try again')),
            ],
          ),
        ),
      );
    }

    if (_posts.isEmpty) {
      return Center(
        child: Text(
          'No posts in this lane yet.',
          style: TextStyle(color: colors.mutedForeground),
        ),
      );
    }

    return ListView.separated(
      controller: _scrollController,
      scrollDirection: Axis.horizontal,
      padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
      itemCount: _posts.length + (_loadingMore ? 1 : 0),
      separatorBuilder: (_, _) => const SizedBox(width: 12),
      itemBuilder: (context, index) {
        if (index >= _posts.length) {
          return SizedBox(
            width: kBlogCardLaneWidth,
            height: kBlogCardLaneHeight,
            child: const AppLoadingCenter(),
          );
        }
        final post = _posts[index];
        return SizedBox(
          width: kBlogCardLaneWidth,
          height: kBlogCardLaneHeight,
          child: BlogCard(
            post: post,
            onTap: () => openBlogFeedPost(context, post),
          ),
        );
      },
    );
  }
}
