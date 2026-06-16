import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/blog_feed_post.dart';
import '../../services/auth_api.dart';
import '../../services/blog_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/blog_navigation.dart';
import '../blog/blog_card.dart';
import '../blog/blog_card_skeleton.dart';
import 'profile_overview_section_card.dart';
import 'profile_user_blogs_screen.dart';

const kProfileOverviewBlogsPreviewLimit = 5;
const kProfileOverviewBlogsVisibleCount = 2;
const kProfileOverviewBlogsCardSpacing = 12.0;

double get profileOverviewBlogsViewportHeight =>
    kBlogCardLaneHeight * kProfileOverviewBlogsVisibleCount +
    kProfileOverviewBlogsCardSpacing * (kProfileOverviewBlogsVisibleCount - 1);

class ProfileOverviewBlogsSection extends StatefulWidget {
  const ProfileOverviewBlogsSection({
    super.key,
    required this.username,
    this.pageScrollController,
  });

  final String? username;
  final ScrollController? pageScrollController;

  @override
  State<ProfileOverviewBlogsSection> createState() => ProfileOverviewBlogsSectionState();
}

class ProfileOverviewBlogsSectionState extends State<ProfileOverviewBlogsSection> {
  final _api = BlogApi();

  List<BlogFeedPost> _posts = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => reload());
  }

  @override
  void didUpdateWidget(covariant ProfileOverviewBlogsSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.username != widget.username) {
      reload();
    }
  }

  Future<void> reload() => _load();

  Future<void> _load() async {
    final username = widget.username?.trim();
    if (username == null || username.isEmpty) {
      setState(() {
        _loading = false;
        _posts = const [];
        _error = null;
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    final token = context.read<AuthState>().accessToken;
    try {
      final posts = await _api.getUserPublishedPosts(
        username: username,
        limit: kProfileOverviewBlogsPreviewLimit,
        accessToken: token,
      );
      if (!mounted) return;
      setState(() {
        _posts = posts.take(kProfileOverviewBlogsPreviewLimit).toList();
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
        _error = 'Could not load blogs.';
        _posts = const [];
        _loading = false;
      });
    }
  }

  void _openViewAll(BuildContext context) {
    final username = widget.username?.trim();
    if (username == null || username.isEmpty) return;
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => ProfileUserBlogsScreen(username: username),
      ),
    );
  }

  bool _handleNestedBlogsScroll(ScrollNotification notification) {
    if (notification.metrics.axis != Axis.vertical) return false;

    final metrics = notification.metrics;
    if (metrics.maxScrollExtent <= 0) return false;

    const edgeTolerance = 0.5;
    final atTop = metrics.pixels <= metrics.minScrollExtent + edgeTolerance;
    final atBottom = metrics.pixels >= metrics.maxScrollExtent - edgeTolerance;

    if (notification is ScrollUpdateNotification) {
      final delta = notification.scrollDelta;
      if (delta == null) return true;

      final handingOffToPage =
          (atTop && delta < 0) || (atBottom && delta > 0);
      if (handingOffToPage) {
        _scrollProfilePage(delta);
        return true;
      }

      // Inner list is scrolling — absorb so navbar does not react.
      return true;
    }

    if (notification is OverscrollNotification) {
      if ((atTop && notification.overscroll < 0) ||
          (atBottom && notification.overscroll > 0)) {
        _scrollProfilePage(notification.overscroll);
        return true;
      }
      return true;
    }

    return false;
  }

  void _scrollProfilePage(double delta) {
    final controller = widget.pageScrollController;
    if (controller == null || !controller.hasClients) return;

    final position = controller.position;
    final next = (position.pixels + delta).clamp(
      position.minScrollExtent,
      position.maxScrollExtent,
    );
    if (next != position.pixels) {
      controller.jumpTo(next);
    }
  }

  @override
  Widget build(BuildContext context) {
    final username = widget.username?.trim();
    final hasUsername = username != null && username.isNotEmpty;

    return ProfileOverviewSectionCard(
      title: 'Blogs',
      icon: Icons.article_outlined,
      isEmpty: !_loading && _error == null && _posts.isEmpty,
      emptyMessage: 'No published posts yet',
      onViewAll: hasUsername && _posts.isNotEmpty ? () => _openViewAll(context) : null,
      child: _buildBody(context),
    );
  }

  Widget _buildBody(BuildContext context) {
    if (_loading) {
      return SizedBox(
        height: profileOverviewBlogsViewportHeight,
        child: const BlogCardListSkeleton(count: 2, spacing: kProfileOverviewBlogsCardSpacing),
      );
    }

    if (_error != null) {
      return _BlogsErrorBox(message: _error!, onRetry: _load);
    }

    if (_posts.isEmpty) {
      return const SizedBox.shrink();
    }

    return SizedBox(
      height: profileOverviewBlogsViewportHeight,
      child: NotificationListener<ScrollNotification>(
        onNotification: _handleNestedBlogsScroll,
        child: ListView.separated(
          padding: EdgeInsets.zero,
          physics: const ClampingScrollPhysics(),
          itemCount: _posts.length,
          separatorBuilder: (context, _) => const SizedBox(height: kProfileOverviewBlogsCardSpacing),
          itemBuilder: (context, index) {
            final post = _posts[index];
            return BlogCard(
              post: post,
              onTap: () => openBlogFeedPost(context, post),
            );
          },
        ),
      ),
    );
  }
}

class _BlogsErrorBox extends StatelessWidget {
  const _BlogsErrorBox({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: colors.border.withValues(alpha: 0.75), width: 2),
      ),
      child: Column(
        children: [
          Text(
            message,
            textAlign: TextAlign.center,
            style: TextStyle(color: colors.mutedForeground, fontSize: 13),
          ),
          const SizedBox(height: 10),
          TextButton(onPressed: onRetry, child: const Text('Try again')),
        ],
      ),
    );
  }
}
