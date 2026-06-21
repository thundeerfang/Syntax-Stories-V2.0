import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../controllers/blog_comment_thread.dart';
import '../../models/blog_comment.dart';
import '../../models/blog_feed_post.dart';
import '../../models/blog_post_detail.dart';
import '../../models/app_feedback.dart';
import '../../services/auth_api.dart';
import '../../services/blog_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/bio_display.dart';
import '../../utils/blog_card_format.dart';
import '../../utils/resolve_profile_media_url.dart';
import '../../widgets/blog/blog_comments_section.dart';
import '../../widgets/blog/blog_engagement_dock.dart';
import '../../widgets/blog/blog_public_body.dart';
import '../../widgets/blog/story_scroll_progress_bar.dart';
import '../../widgets/navigation/screen_app_bar.dart';
import '../../widgets/ui/app_feedback_toast.dart';
import '../../widgets/ui/app_loading_indicator.dart';

/// Native blog reader — mirrors webapp `PublicBlogPostPage`.
class BlogPostDetailScreen extends StatefulWidget {
  const BlogPostDetailScreen({
    super.key,
    required this.username,
    required this.slug,
    this.preview,
  });

  final String username;
  final String slug;
  final BlogFeedPost? preview;

  @override
  State<BlogPostDetailScreen> createState() => _BlogPostDetailScreenState();
}

class _BlogPostDetailScreenState extends State<BlogPostDetailScreen> {
  static const _toastBottomMargin = 118.0;

  final _api = BlogApi();
  ScrollController _scrollController = ScrollController();
  GlobalKey _commentsKey = GlobalKey();
  GlobalKey _composerKey = GlobalKey();

  BlogCommentThreadController? _commentThreadCache;

  BlogCommentThreadController get _thread {
    return _commentThreadCache ??= BlogCommentThreadController(
      api: _api,
      username: widget.username,
      slug: widget.slug,
    );
  }

  BlogPostDetail? _post;
  bool _loading = true;
  String? _error;
  late StoryScrollProgressController _scrollProgressController;
  late ValueNotifier<bool> _commentsInView;

  bool _commentSubmitting = false;
  bool _respectBusy = false;
  bool _repostBusy = false;
  bool _bookmarkBusy = false;
  bool _loadingMoreComments = false;

  @override
  void initState() {
    super.initState();
    _initScrollTracking();
    _thread;
    if (widget.preview != null) {
      _post = BlogPostDetail.fromFeedPreview(widget.preview!);
    }
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadPost();
      _loadComments();
    });
  }

  void _initScrollTracking() {
    _scrollProgressController = StoryScrollProgressController();
    _commentsInView = ValueNotifier(false);
  }

  @override
  void reassemble() {
    super.reassemble();
    final previousProgress = _scrollProgressController.progress.value;
    final previousCommentsInView = _commentsInView.value;
    _scrollProgressController.dispose();
    _commentsInView.dispose();
    _initScrollTracking();
    _scrollProgressController.progress.value = previousProgress;
    _commentsInView.value = previousCommentsInView;
    _resetScrollControllerForHotReload();
    _commentsKey = GlobalKey();
    _composerKey = GlobalKey();
  }

  void _resetScrollControllerForHotReload() {
    final offset = _scrollController.hasClients
        ? _scrollController.offset
        : 0.0;
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _scrollController = ScrollController(initialScrollOffset: offset);
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _scrollProgressController.dispose();
    _commentsInView.dispose();
    _commentThreadCache?.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!mounted || !_scrollController.hasClients) return;

    final commentsCtx = _commentsKey.currentContext;
    if (commentsCtx != null) {
      final box = commentsCtx.findRenderObject();
      if (box is RenderBox) {
        final top = box.localToGlobal(Offset.zero).dy;
        final inView = top < MediaQuery.sizeOf(context).height * 0.75;
        if (inView != _commentsInView.value) {
          _commentsInView.value = inView;
        }
      }
    }
  }

  bool _onScrollNotification(ScrollNotification notification) {
    _scrollProgressController.absorbNotification(notification);

    if (notification is! ScrollUpdateNotification &&
        notification is! ScrollEndNotification) {
      return false;
    }
    final metrics = notification.metrics;
    if (metrics.pixels >= metrics.maxScrollExtent - 420) {
      _maybeLoadMoreComments();
    }
    return false;
  }

  void _maybeLoadMoreComments() {
    if (!mounted ||
        _loadingMoreComments ||
        _thread.rootsLoadingMore ||
        !_thread.rootHasMore) {
      return;
    }
    _loadingMoreComments = true;
    _thread.loadMoreRoots().whenComplete(() {
      if (mounted) setState(() => _loadingMoreComments = false);
    });
  }

  Future<void> _loadPost() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final token = context.read<AuthState>().accessToken;
    try {
      final post = await _api.fetchPublishedPost(
        username: widget.username,
        slug: widget.slug,
        accessToken: token,
      );
      if (!mounted) return;
      setState(() {
        _post = post;
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
        _error = 'Could not load this story.';
        _loading = false;
      });
    }
  }

  Future<void> _loadComments() async {
    final token = context.read<AuthState>().accessToken;
    _thread.updateAccessToken(token);
    await _thread.loadRoots(replace: true);
  }

  void _showStoryToast(String message, AppFeedbackKind kind) {
    if (!mounted) return;
    AppFeedbackToast.show(
      context,
      message: message,
      kind: kind,
      bottomMargin: _toastBottomMargin,
    );
  }

  String? _requireToken() {
    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      _showStoryToast(
        'Sign in to interact with this post.',
        AppFeedbackKind.warning,
      );
      return null;
    }
    return token;
  }

  Future<void> _toggleRespect() async {
    final post = _post;
    final token = _requireToken();
    if (post == null || token == null || _respectBusy) return;

    final wantOn = !post.viewerHasRespected;
    setState(() => _respectBusy = true);
    try {
      final result = await _api.setPostRespect(
        username: widget.username,
        slug: widget.slug,
        respecting: wantOn,
        accessToken: token,
      );
      if (!mounted) return;
      setState(() {
        _post = post.copyWith(
          viewerHasRespected: result.respecting,
          respectCount: result.respectCount,
        );
        _respectBusy = false;
      });
      if (wantOn && !result.respecting) {
        _showStoryToast(
          'You can\'t Respect your own post.',
          AppFeedbackKind.warning,
        );
      }
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() => _respectBusy = false);
      _showStoryToast(e.message, AppFeedbackKind.error);
    } catch (_) {
      if (!mounted) return;
      setState(() => _respectBusy = false);
      _showStoryToast('Could not update Respect.', AppFeedbackKind.error);
    }
  }

  Future<void> _toggleRepost() async {
    final post = _post;
    final token = _requireToken();
    if (post == null || token == null || _repostBusy) return;

    final wantOn = !post.viewerHasReposted;
    setState(() => _repostBusy = true);
    try {
      final result = await _api.setPostRepost(
        username: widget.username,
        slug: widget.slug,
        reposting: wantOn,
        accessToken: token,
      );
      if (!mounted) return;
      setState(() {
        _post = post.copyWith(
          viewerHasReposted: result.active,
          repostCount: result.count,
        );
        _repostBusy = false;
      });
      if (wantOn && !result.active) {
        _showStoryToast(
          'You can\'t Repost your own post.',
          AppFeedbackKind.warning,
        );
      }
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() => _repostBusy = false);
      _showStoryToast(e.message, AppFeedbackKind.error);
    } catch (_) {
      if (!mounted) return;
      setState(() => _repostBusy = false);
      _showStoryToast('Could not update repost.', AppFeedbackKind.error);
    }
  }

  Future<void> _toggleBookmark() async {
    final post = _post;
    final token = _requireToken();
    if (post == null || token == null || _bookmarkBusy) return;

    final wantOn = !post.viewerHasBookmarked;
    setState(() => _bookmarkBusy = true);
    try {
      final result = await _api.setPostBookmark(
        username: widget.username,
        slug: widget.slug,
        bookmarked: wantOn,
        accessToken: token,
      );
      if (!mounted) return;
      setState(() {
        _post = post.copyWith(
          viewerHasBookmarked: result.active,
          bookmarkCount: result.count,
        );
        _bookmarkBusy = false;
      });
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() => _bookmarkBusy = false);
      _showStoryToast(e.message, AppFeedbackKind.error);
    } catch (_) {
      if (!mounted) return;
      setState(() => _bookmarkBusy = false);
      _showStoryToast('Could not update bookmark.', AppFeedbackKind.error);
    }
  }

  Future<void> _scrollToComments() async {
    if (!mounted || !_scrollController.hasClients) return;

    Future<bool> revealComments({
      Duration duration = const Duration(milliseconds: 420),
    }) async {
      if (!mounted || !_scrollController.hasClients) return false;

      for (final key in [_composerKey, _commentsKey]) {
        if (!mounted) return false;
        final ctx = key.currentContext;
        if (ctx == null || !ctx.mounted) continue;

        final renderObject = ctx.findRenderObject();
        if (renderObject is! RenderBox ||
            !renderObject.hasSize ||
            !renderObject.attached) {
          continue;
        }

        if (!mounted) return false;

        await Scrollable.ensureVisible(
          ctx,
          duration: duration,
          curve: Curves.easeOutCubic,
          alignment: 0.12,
        );
        return true;
      }
      return false;
    }

    if (await revealComments()) return;

    final position = _scrollController.position;
    if (position.maxScrollExtent <= 0) return;

    // Off-screen comment widgets may not be laid out yet; scroll down first so
    // ListView materializes them, then snap to the composer.
    await _scrollController.animateTo(
      position.maxScrollExtent,
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
    );

    if (!mounted) return;
    await WidgetsBinding.instance.endOfFrame;
    await revealComments(duration: const Duration(milliseconds: 260));
  }

  Future<void> _submitComment(String text, {String? parentId}) async {
    final token = _requireToken();
    if (token == null) return;

    setState(() => _commentSubmitting = true);
    try {
      final comment = await _api.postComment(
        username: widget.username,
        slug: widget.slug,
        text: text,
        accessToken: token,
        parentId: parentId,
      );
      if (!mounted) return;
      await _thread.onCommentPosted(comment);
      setState(() {
        _commentSubmitting = false;
        final post = _post;
        if (post != null) {
          _post = post.copyWith(commentCount: post.commentCount + 1);
        }
      });
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() => _commentSubmitting = false);
      _showStoryToast(e.message, AppFeedbackKind.error);
    } catch (_) {
      if (!mounted) return;
      setState(() => _commentSubmitting = false);
      _showStoryToast('Could not post comment.', AppFeedbackKind.error);
    }
  }

  Future<void> _toggleCommentLike(BlogComment comment) async {
    final token = _requireToken();
    if (token == null) return;

    try {
      final result = await _api.toggleCommentLike(
        username: widget.username,
        slug: widget.slug,
        commentId: comment.id,
        accessToken: token,
      );
      if (!mounted) return;
      _thread.patchLike(
        comment.id,
        likeCount: result.likeCount,
        likedByViewer: result.likedByViewer,
      );
    } on AuthApiException catch (e) {
      if (!mounted) return;
      _showStoryToast(e.message, AppFeedbackKind.error);
    } catch (_) {
      if (!mounted) return;
      _showStoryToast('Could not update like.', AppFeedbackKind.error);
    }
  }

  Future<void> _deleteComment(BlogComment comment) async {
    final token = _requireToken();
    if (token == null) return;

    try {
      await _api.deleteComment(
        username: widget.username,
        slug: widget.slug,
        commentId: comment.id,
        accessToken: token,
      );
      if (!mounted) return;
      await _thread.loadRoots(replace: true);
      if (!mounted) return;
      setState(() {
        final post = _post;
        if (post != null) {
          _post = post.copyWith(
            commentCount: _thread.postTotal > 0
                ? _thread.postTotal
                : post.commentCount,
          );
        }
      });
    } on AuthApiException catch (e) {
      if (!mounted) return;
      _showStoryToast(e.message, AppFeedbackKind.error);
    } catch (_) {
      if (!mounted) return;
      _showStoryToast('Could not delete comment.', AppFeedbackKind.error);
    }
  }

  Future<void> _updateComment(BlogComment comment, String text) async {
    final token = _requireToken();
    if (token == null) return;

    try {
      final updated = await _api.patchComment(
        username: widget.username,
        slug: widget.slug,
        commentId: comment.id,
        text: text,
        accessToken: token,
      );
      if (!mounted) return;
      _thread.patchComment(updated);
    } on AuthApiException catch (e) {
      if (!mounted) return;
      _showStoryToast(e.message, AppFeedbackKind.error);
    } catch (_) {
      if (!mounted) return;
      _showStoryToast('Could not update comment.', AppFeedbackKind.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final post = _post;
    final auth = context.watch<AuthState>();
    final viewerUserId = auth.user?.id;
    final viewerUsername = auth.user?.username;
    final isSignedIn = auth.accessToken != null && auth.accessToken!.isNotEmpty;
    _thread.updateAccessToken(auth.accessToken);
    final commentCount = _thread.postTotal > 0
        ? _thread.postTotal
        : (post?.commentCount ?? 0);

    return Scaffold(
      backgroundColor: colors.background,
      appBar: ScreenAppBar(
        title: 'Story',
        extraBottom: StoryScrollProgressBar(
          progress: _scrollProgressController.progress,
          color: primary,
          trackColor: colors.muted.withValues(alpha: 0.2),
        ),
      ),
      body: Stack(
        children: [
          if (_loading && post == null)
            const AppLoadingCenter()
          else if (_error != null && post == null)
            _ErrorState(message: _error!, onRetry: _loadPost)
          else if (post != null)
            RefreshIndicator(
              onRefresh: () async {
                await Future.wait([_loadPost(), _loadComments()]);
              },
              child: NotificationListener<ScrollNotification>(
                onNotification: _onScrollNotification,
                child: ListView(
                  controller: _scrollController,
                  padding: const EdgeInsets.fromLTRB(0, 0, 0, 110),
                  children: [
                    _DetailHeader(
                      post: post,
                      commentCount: commentCount,
                      loading: _loading && post.content.isEmpty,
                    ),
                    if (post.content.isNotEmpty) ...[
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: BlogPublicBody(content: post.content),
                      ),
                    ] else if (_loading)
                      const Padding(
                        padding: EdgeInsets.all(24),
                        child: AppLoadingCenter(),
                      ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
                      child: Container(
                        key: _commentsKey,
                        child: BlogCommentsSection(
                          thread: _thread,
                          fallbackCommentCount: post.commentCount,
                          composerKey: _composerKey,
                          onSubmit: _submitComment,
                          submitting: _commentSubmitting,
                          viewerUserId: viewerUserId,
                          viewerUsername: viewerUsername,
                          isSignedIn: isSignedIn,
                          onRequireAuth: () => _requireToken(),
                          onLike: _toggleCommentLike,
                          onDelete: _deleteComment,
                          onUpdate: _updateComment,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    _Footer(
                      colors: colors,
                      primary: primary,
                      onScrollTop: () {
                        _scrollController.animateTo(
                          0,
                          duration: const Duration(milliseconds: 400),
                          curve: Curves.easeOutCubic,
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          if (post != null)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: ValueListenableBuilder<bool>(
                valueListenable: _commentsInView,
                builder: (context, commentsHighlighted, _) {
                  return BlogEngagementDock(
                    respectCount: post.respectCount,
                    repostCount: post.repostCount,
                    bookmarkCount: post.bookmarkCount,
                    commentCount: commentCount,
                    viewerHasRespected: post.viewerHasRespected,
                    viewerHasReposted: post.viewerHasReposted,
                    viewerHasBookmarked: post.viewerHasBookmarked,
                    onRespect: _toggleRespect,
                    onRepost: _toggleRepost,
                    onBookmark: _toggleBookmark,
                    onComment: _scrollToComments,
                    respectBusy: _respectBusy,
                    repostBusy: _repostBusy,
                    bookmarkBusy: _bookmarkBusy,
                    commentsHighlighted: commentsHighlighted,
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _DetailHeader extends StatelessWidget {
  const _DetailHeader({
    required this.post,
    required this.commentCount,
    required this.loading,
  });

  final BlogPostDetail post;
  final int commentCount;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final onPrimary = colors.primaryForeground;
    final dateLabel = blogDetailDateLong(post.publishedAt);
    final categoryLabel = blogCategoryLabel(post.toFeedPost()).toUpperCase();
    final displayTitle = titleCaseEveryWord(post.title);
    final summaryPlain = bioToPlainText(post.summary);
    final coverUrl = resolveProfileMediaUrl(post.thumbnailUrl);
    final authorName =
        (post.author.fullName.trim().isNotEmpty
                ? post.author.fullName.trim()
                : post.author.username.trim())
            .toUpperCase();
    final avatarUrl = resolveProfileMediaUrl(post.author.profileImg);
    final readMinutes = blogReadMinutes(post.toFeedPost());

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (dateLabel.isNotEmpty)
                _MetaChip(
                  icon: Icons.calendar_today_outlined,
                  label: dateLabel,
                  colors: colors,
                ),
              _MetaChip(
                icon: Icons.layers_outlined,
                label: categoryLabel,
                colors: colors,
                filled: true,
                primary: primary,
                onPrimary: onPrimary,
              ),
              _MetaChip(
                icon: Icons.schedule,
                label: '${readMinutes}M READ',
                colors: colors,
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
          child: Text(
            displayTitle,
            style: GoogleFonts.inter(
              fontSize: 28,
              fontWeight: FontWeight.w900,
              height: 1.05,
              letterSpacing: -0.5,
              color: colors.foreground,
            ),
          ),
        ),
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              _AuthorAvatar(url: avatarUrl, label: authorName, colors: colors),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      authorName,
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: colors.foreground,
                      ),
                    ),
                    Text(
                      '@${post.author.username}',
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        color: colors.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              _StoryHeaderStats(
                respectCount: post.respectCount,
                repostCount: post.repostCount,
                commentCount: commentCount,
                viewCount: post.viewCount,
                colors: colors,
              ),
            ],
          ),
        ),
        if (coverUrl.isNotEmpty) ...[
          const SizedBox(height: 20),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: DecoratedBox(
              decoration: BoxDecoration(
                border: Border.all(color: colors.border, width: 3),
                boxShadow: [
                  BoxShadow(
                    color: colors.shadow.withValues(alpha: 0.12),
                    offset: const Offset(4, 4),
                    blurRadius: 0,
                  ),
                ],
              ),
              child: Image.network(
                coverUrl,
                height: 200,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => const SizedBox(height: 200),
              ),
            ),
          ),
        ],
        if (summaryPlain.isNotEmpty) ...[
          const SizedBox(height: 20),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              decoration: BoxDecoration(
                border: Border(left: BorderSide(color: primary, width: 4)),
                color: primary.withValues(alpha: 0.06),
              ),
              padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.terminal, size: 16, color: primary),
                      const SizedBox(width: 6),
                      Text(
                        'BRIEFING FIELD',
                        style: GoogleFonts.inter(
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.4,
                          color: primary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    summaryPlain,
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      height: 1.55,
                      fontStyle: FontStyle.italic,
                      color: colors.foreground.withValues(alpha: 0.85),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
        const SizedBox(height: 20),
        if (loading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Center(
              child: SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          ),
      ],
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({
    required this.icon,
    required this.label,
    required this.colors,
    this.filled = false,
    this.primary,
    this.onPrimary,
  });

  final IconData icon;
  final String label;
  final AppColorTokens colors;
  final bool filled;
  final Color? primary;
  final Color? onPrimary;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        border: Border.all(
          color: filled ? (primary ?? colors.primary) : colors.border,
          width: 2,
        ),
        color: filled
            ? (primary ?? colors.primary)
            : colors.muted.withValues(alpha: 0.25),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 12,
            color: filled
                ? (onPrimary ?? colors.primaryForeground)
                : colors.primary,
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 9,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.6,
              color: filled
                  ? (onPrimary ?? colors.primaryForeground)
                  : colors.foreground,
            ),
          ),
        ],
      ),
    );
  }
}

class _StoryHeaderStats extends StatelessWidget {
  const _StoryHeaderStats({
    required this.respectCount,
    required this.repostCount,
    required this.commentCount,
    required this.viewCount,
    required this.colors,
  });

  final int respectCount;
  final int repostCount;
  final int commentCount;
  final int viewCount;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _StoryHeaderStat(
          colors: colors,
          count: respectCount,
          icon: SvgPicture.asset(
            'assets/icons/lightning-bolt.svg',
            width: 13,
            height: 13,
          ),
        ),
        const SizedBox(width: 8),
        _StoryHeaderStat(
          colors: colors,
          count: repostCount,
          icon: Icon(
            Icons.repeat_rounded,
            size: 13,
            color: colors.mutedForeground,
          ),
        ),
        const SizedBox(width: 8),
        _StoryHeaderStat(
          colors: colors,
          count: commentCount,
          icon: Icon(
            Icons.chat_bubble_outline_rounded,
            size: 13,
            color: colors.mutedForeground,
          ),
        ),
        if (viewCount > 0) ...[
          const SizedBox(width: 8),
          _StoryHeaderStat(
            colors: colors,
            count: viewCount,
            icon: Icon(
              Icons.visibility_outlined,
              size: 13,
              color: colors.mutedForeground,
            ),
          ),
        ],
      ],
    );
  }
}

class _StoryHeaderStat extends StatelessWidget {
  const _StoryHeaderStat({
    required this.colors,
    required this.count,
    required this.icon,
  });

  final AppColorTokens colors;
  final int count;
  final Widget icon;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        icon,
        const SizedBox(width: 3),
        Text(
          formatEngagementCount(count),
          style: GoogleFonts.jetBrainsMono(
            fontSize: 9,
            fontWeight: FontWeight.w700,
            color: colors.mutedForeground,
          ),
        ),
      ],
    );
  }
}

class _AuthorAvatar extends StatelessWidget {
  const _AuthorAvatar({
    required this.url,
    required this.label,
    required this.colors,
  });

  final String url;
  final String label;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final letter = label.isNotEmpty ? label[0].toUpperCase() : '?';
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        border: Border.all(color: colors.border, width: 2),
        color: colors.muted.withValues(alpha: 0.2),
      ),
      clipBehavior: Clip.hardEdge,
      child: url.isNotEmpty
          ? Image.network(
              url,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => Center(
                child: Text(
                  letter,
                  style: GoogleFonts.inter(fontWeight: FontWeight.w900),
                ),
              ),
            )
          : Center(
              child: Text(
                letter,
                style: GoogleFonts.inter(fontWeight: FontWeight.w900),
              ),
            ),
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer({
    required this.colors,
    required this.primary,
    required this.onScrollTop,
  });

  final AppColorTokens colors;
  final Color primary;
  final VoidCallback onScrollTop;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(color: colors.border.withValues(alpha: 0.5)),
        ),
      ),
      child: Row(
        children: [
          Container(width: 8, height: 8, color: primary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'END OF TRANSMISSION // ${DateTime.now().year}',
              style: GoogleFonts.inter(
                fontSize: 9,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.8,
                color: colors.mutedForeground,
              ),
            ),
          ),
          TextButton.icon(
            onPressed: onScrollTop,
            icon: const Icon(Icons.arrow_upward, size: 14),
            label: Text(
              'TOP',
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              message,
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(color: colors.foreground),
            ),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
