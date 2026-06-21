import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/blog_feed_post.dart';
import '../../services/auth_api.dart';
import '../../services/blog_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/blog_navigation.dart';
import '../../widgets/blog/blog_card.dart';
import '../../widgets/navigation/main_app_bar.dart';
import '../../widgets/ui/app_loading_indicator.dart';
import '../../widgets/ui/app_pull_to_refresh.dart';

/// Scrollable feed tab — Home (recent) or Trending (views).
class BlogFeedTab extends StatefulWidget {
  const BlogFeedTab({
    super.key,
    required this.sort,
    required this.emptyTitle,
    required this.emptyMessage,
  });

  final BlogFeedSort sort;
  final String emptyTitle;
  final String emptyMessage;

  @override
  State<BlogFeedTab> createState() => BlogFeedTabState();
}

class BlogFeedTabState extends State<BlogFeedTab> {
  final _api = BlogApi();
  List<BlogFeedPost> _posts = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> reload() => _load();

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final token = context.read<AuthState>().accessToken;
    try {
      final page = await _api.fetchPublishedFeed(
        sort: widget.sort,
        accessToken: token,
      );
      if (!mounted) return;
      setState(() {
        _posts = page.posts;
        _loading = false;
      });
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load stories.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final topInset = MainAppBar.totalHeight(context);
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    const navReserve = 96.0;

    return AppPullToRefresh(
      onRefresh: _load,
      child: CustomScrollView(
        physics: AppPullToRefresh.scrollPhysics,
        slivers: [
          SliverToBoxAdapter(child: SizedBox(height: topInset)),
          if (_loading)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: AppLoadingCenter(),
            )
          else if (_error != null)
            SliverFillRemaining(
              hasScrollBody: false,
              child: _FeedEmptyState(
                icon: Icons.error_outline_rounded,
                title: 'Could not load stories',
                message: _error!,
                actionLabel: 'Try again',
                onAction: _load,
              ),
            )
          else if (_posts.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: _FeedEmptyState(
                icon: widget.sort == BlogFeedSort.views
                    ? Icons.local_fire_department_rounded
                    : Icons.home_rounded,
                title: widget.emptyTitle,
                message: widget.emptyMessage,
              ),
            )
          else
            SliverPadding(
              padding: EdgeInsets.fromLTRB(16, 12, 16, bottomInset + navReserve),
              sliver: SliverList.separated(
                itemCount: _posts.length,
                separatorBuilder: (_, _) => const SizedBox(height: 20),
                itemBuilder: (context, index) {
                  final post = _posts[index];
                  return BlogCard(
                    post: post,
                    onTap: () => openBlogFeedPost(context, post),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _FeedEmptyState extends StatelessWidget {
  const _FeedEmptyState({
    required this.icon,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 40, color: colors.mutedForeground),
          const SizedBox(height: 12),
          Text(
            title.toUpperCase(),
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.6,
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
            const SizedBox(height: 16),
            TextButton(onPressed: onAction, child: Text(actionLabel!)),
          ],
        ],
      ),
    );
  }
}
