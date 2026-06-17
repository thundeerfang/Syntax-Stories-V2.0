import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/blog_feed_post.dart';
import '../../services/auth_api.dart';
import '../../services/reposts_api.dart';
import '../../state/auth_state.dart';
import '../../utils/blog_navigation.dart';
import '../blog/blog_card.dart';
import '../blog/blog_card_skeleton.dart';
import 'profile_activity_shared.dart';

class ProfileRepostsPanel extends StatefulWidget {
  const ProfileRepostsPanel({super.key});

  @override
  State<ProfileRepostsPanel> createState() => ProfileRepostsPanelState();
}

class ProfileRepostsPanelState extends State<ProfileRepostsPanel> {
  final _api = RepostsApi();
  final _search = TextEditingController();

  List<BlogFeedPost> _posts = const [];
  bool _loading = true;
  String? _error;
  String _searchDebounced = '';
  String _sort = 'newest';

  @override
  void initState() {
    super.initState();
    _search.addListener(_onSearchChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) => reload());
  }

  @override
  void dispose() {
    _search.removeListener(_onSearchChanged);
    _search.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    final next = _search.text.trim().toLowerCase();
    if (next == _searchDebounced) return;
    setState(() => _searchDebounced = next);
  }

  Future<void> reload() => _loadPosts();

  Future<void> _loadPosts() async {
    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      setState(() {
        _loading = false;
        _posts = const [];
        _error = 'Sign in to see your reposts.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final posts = await _api.listRepostedPosts(
        accessToken: token,
        limit: 80,
        sort: _sort,
      );
      if (!mounted) return;
      setState(() {
        _posts = posts;
        _loading = false;
      });
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _posts = const [];
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load reposts.';
        _posts = const [];
        _loading = false;
      });
    }
  }

  List<BlogFeedPost> get _filtered {
    if (_searchDebounced.isEmpty) return _posts;
    return _posts.where((post) {
      final hay = '${post.title} ${post.summary}'.toLowerCase();
      return hay.contains(_searchDebounced);
    }).toList();
  }

  void _syncPost(BlogFeedPost next) {
    if (!next.viewerHasReposted) {
      setState(() => _posts = _posts.where((p) => p.id != next.id).toList());
      return;
    }
    setState(() {
      _posts = [
        for (final post in _posts) post.id == next.id ? next : post,
      ];
    });
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ProfileActivitySearchSortBar(
          showContainer: false,
          inlineSearchAndSort: true,
          searchController: _search,
          searchHint: 'Search reposts',
          sortValue: _sort,
          sortOptions: kNewestOldestSortOptions,
          onSortChanged: (value) {
            if (value == _sort) return;
            setState(() => _sort = value);
            _loadPosts();
          },
        ),
        const SizedBox(height: 16),
        if (_loading)
          const BlogCardListSkeleton(count: 4)
        else if (_error != null)
          ProfileActivityError(message: _error!, onRetry: _loadPosts)
        else if (_posts.isEmpty)
          const ProfileActivityEmpty(
            icon: Icons.repeat_rounded,
            title: 'No reposts yet',
            message: 'When you repost a story from the feed, it will show up here.',
          )
        else if (filtered.isEmpty)
          ProfileActivityEmpty(
            icon: Icons.search_off_rounded,
            title: 'No matching reposts',
            message: 'Try a different search term or clear the filter.',
            actionLabel: 'Clear search',
            onAction: () => _search.clear(),
          )
        else
          Column(
            children: [
              for (var i = 0; i < filtered.length; i++) ...[
                if (i > 0) const SizedBox(height: 16),
                BlogCard(
                  post: filtered[i],
                  onTap: () => openBlogFeedPost(context, filtered[i]),
                  onPostChanged: (next) => _syncPost(next),
                ),
              ],
            ],
          ),
      ],
    );
  }
}
