import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/blog_feed_post.dart';
import '../../models/blog_taxonomy.dart';
import '../../services/auth_api.dart';
import '../../services/blog_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/blog_navigation.dart';
import '../../widgets/blog/blog_card.dart';
import '../../widgets/blog/blog_card_skeleton.dart';
import '../../widgets/navigation/screen_app_bar.dart';
import '../../widgets/topics/taxonomy_feed_header.dart';
import '../../widgets/ui/app_loading_indicator.dart';
import '../../widgets/ui/app_pull_to_refresh.dart';
import '../../widgets/ui/dashed_border_box.dart';

/// Full tag feed — mirrors web `/topics/:slug`.
class TopicsTagFeedScreen extends StatefulWidget {
  const TopicsTagFeedScreen({
    super.key,
    required this.tag,
  });

  final BlogTaxonomyRow tag;

  @override
  State<TopicsTagFeedScreen> createState() => _TopicsTagFeedScreenState();
}

class _TopicsTagFeedScreenState extends State<TopicsTagFeedScreen> {
  final _api = BlogApi();
  final _searchController = TextEditingController();

  List<BlogFeedPost> _posts = const [];
  bool _loading = true;
  bool _loadingMore = false;
  bool _hasMore = false;
  String? _error;
  int _offset = 0;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() => setState(() => _search = _searchController.text));
    _load(reset: true);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<BlogFeedPost> get _filtered {
    final q = _search.trim().toLowerCase();
    if (q.isEmpty) return _posts;
    return _posts.where((p) {
      return p.title.toLowerCase().contains(q) ||
          p.summary.toLowerCase().contains(q) ||
          p.author.username.toLowerCase().contains(q);
    }).toList();
  }

  int get _displayCount {
    if (_search.trim().isNotEmpty) return _filtered.length;
    final indexed = widget.tag.postCount;
    return indexed > 0 ? indexed : _posts.length;
  }

  String get _countLabel {
    if (_search.trim().isNotEmpty) {
      return '${_displayCount} matching posts';
    }
    return '${_displayCount} total posts';
  }

  String get _displayTitle {
    final name = widget.tag.name.trim();
    if (name.isNotEmpty) return '#$name';
    return '#${widget.tag.slug}';
  }

  Future<void> _load({required bool reset}) async {
    if (reset) {
      setState(() {
        _loading = true;
        _error = null;
        _offset = 0;
      });
    } else {
      if (_loadingMore || !_hasMore) return;
      setState(() => _loadingMore = true);
    }

    final token = context.read<AuthState>().accessToken;
    try {
      final page = await _api.fetchPublishedFeed(
        limit: 24,
        offset: reset ? 0 : _offset,
        tag: widget.tag.slug,
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

  Widget _buildIntro(String title) {
    return TaxonomyFeedScrollIntro(
      icon: Icons.tag_outlined,
      title: title,
      searchController: _searchController,
      searchHint: 'Search in $title…',
      postCount: _displayCount,
      postCountLabel: _countLabel,
      postCountLoading: _loading,
    );
  }

  Widget _buildBody(BuildContext context, List<BlogFeedPost> filtered, String title) {
    final colors = context.appColors;

    if (_loading) {
      return ListView(
        physics: AppPullToRefresh.scrollPhysics,
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          _buildIntro(title),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                BlogCardSkeleton(),
                SizedBox(height: 16),
                BlogCardSkeleton(),
              ],
            ),
          ),
        ],
      );
    }

    if (_error != null) {
      return ListView(
        physics: AppPullToRefresh.scrollPhysics,
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          _buildIntro(title),
          Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              children: [
                Text(_error!, textAlign: TextAlign.center, style: TextStyle(color: colors.mutedForeground)),
                TextButton(onPressed: () => _load(reset: true), child: const Text('Try again')),
              ],
            ),
          ),
        ],
      );
    }

    if (filtered.isEmpty) {
      return ListView(
        physics: AppPullToRefresh.scrollPhysics,
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          _buildIntro(title),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: _TagFeedEmptyState(
              searching: _search.trim().isNotEmpty,
            ),
          ),
        ],
      );
    }

    return ListView.separated(
      physics: AppPullToRefresh.scrollPhysics,
      padding: const EdgeInsets.only(bottom: 32),
      itemCount: filtered.length + 1 + (_loadingMore && _search.trim().isEmpty ? 1 : 0),
      separatorBuilder: (context, index) {
        if (index == 0) return const SizedBox(height: 16);
        return const SizedBox(height: 16);
      },
      itemBuilder: (context, index) {
        if (index == 0) return _buildIntro(title);
        final postIndex = index - 1;
        if (postIndex >= filtered.length) {
          _load(reset: false);
          return const Padding(
            padding: EdgeInsets.all(16),
            child: const AppLoadingCenter(),
          );
        }
        final post = filtered[postIndex];
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: BlogCard(post: post, onTap: () => openBlogFeedPost(context, post)),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;
    final title = _displayTitle;

    return Scaffold(
      backgroundColor: context.appColors.background,
      appBar: const ScreenAppBar(title: 'Tag'),
      body: AppPullToRefresh(
        onRefresh: () => _load(reset: true),
        child: _buildBody(context, filtered, title),
      ),
    );
  }
}

class _TagFeedEmptyState extends StatelessWidget {
  const _TagFeedEmptyState({required this.searching});

  final bool searching;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return DashedBorderBox(
      color: colors.border.withValues(alpha: 0.55),
      backgroundColor: colors.muted.withValues(alpha: 0.08),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 28),
      child: Column(
        children: [
          Icon(
            searching ? Icons.search_off_outlined : Icons.article_outlined,
            size: 32,
            color: colors.mutedForeground.withValues(alpha: 0.7),
          ),
          const SizedBox(height: 10),
          Text(
            searching
                ? 'No matches for your search.'
                : 'No posts with this tag yet.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 12,
              height: 1.45,
              color: colors.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}
