import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/blog_feed_post.dart';
import '../../models/blog_block.dart';
import '../../models/blog_post.dart';
import '../../models/blog_write_draft.dart';
import '../../models/user_summary.dart';
import '../../services/auth_api.dart';
import '../../services/blog_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/blog_block_factory.dart';
import '../../utils/blog_navigation.dart';
import '../../screens/blog/blog_create_screen.dart';
import '../blog/blog_card.dart';
import '../blog/blog_card_skeleton.dart';
import '../ui/app_confirm_dialog.dart';
import '../ui/app_feedback_toast.dart';
import '../navigation/screen_app_bar.dart';
import '../ui/app_pull_to_refresh.dart';
import 'profile_activity_shared.dart';
import 'profile_user_blog_card.dart';

enum _BlogStatusTab { published, drafts, deleted }

class ProfileUserBlogsScreen extends StatefulWidget {
  const ProfileUserBlogsScreen({super.key, required this.username});

  final String username;

  @override
  State<ProfileUserBlogsScreen> createState() => _ProfileUserBlogsScreenState();
}

class _ProfileUserBlogsScreenState extends State<ProfileUserBlogsScreen> {
  final _api = BlogApi();

  _BlogStatusTab _tab = _BlogStatusTab.published;

  List<BlogFeedPost> _publicPosts = const [];
  List<BlogPost> _ownerPublished = const [];
  List<BlogPost> _ownerDrafts = const [];
  List<BlogPost> _ownerDeleted = const [];

  bool _loading = true;
  String? _error;
  String? _restoreBusyId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  bool get _isOwner {
    final auth = context.read<AuthState>();
    final token = auth.accessToken;
    final owner = auth.user?.username?.trim().toLowerCase() ?? '';
    return token != null &&
        token.isNotEmpty &&
        owner.isNotEmpty &&
        owner == widget.username.trim().toLowerCase();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final token = context.read<AuthState>().accessToken;
    try {
      if (_isOwner && token != null) {
        final results = await Future.wait([
          _api.listMyPosts(accessToken: token, status: 'published'),
          _api.listMyPosts(accessToken: token, status: 'draft'),
          _api.listMyPosts(accessToken: token, status: 'deleted'),
        ]);
        if (!mounted) return;
        setState(() {
          _ownerPublished = results[0];
          _ownerDrafts = results[1];
          _ownerDeleted = results[2];
          _publicPosts = const [];
          _loading = false;
        });
      } else {
        final posts = await _api.getUserPublishedPosts(
          username: widget.username,
          limit: 120,
          accessToken: token,
        );
        if (!mounted) return;
        setState(() {
          _publicPosts = posts;
          _ownerPublished = const [];
          _ownerDrafts = const [];
          _ownerDeleted = const [];
          _loading = false;
        });
      }
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load blogs.';
        _loading = false;
      });
    }
  }

  List<BlogPost> get _activeOwnerPosts {
    return switch (_tab) {
      _BlogStatusTab.published => _ownerPublished,
      _BlogStatusTab.drafts => _ownerDrafts,
      _BlogStatusTab.deleted => _ownerDeleted,
    };
  }

  int _timestampMs(String? raw) {
    if (raw == null || raw.isEmpty) return 0;
    return DateTime.tryParse(raw)?.millisecondsSinceEpoch ?? 0;
  }

  List<BlogPost> _sortOwnerPosts(List<BlogPost> posts) {
    final rows = [...posts];
    rows.sort((a, b) {
      final aMs = _timestampMs(a.sortTimestamp);
      final bMs = _timestampMs(b.sortTimestamp);
      return bMs.compareTo(aMs);
    });
    return rows;
  }

  List<BlogFeedPost> _sortPublicPosts(List<BlogFeedPost> posts) {
    final rows = [...posts];
    rows.sort((a, b) {
      final aMs = _timestampMs(a.publishedAt);
      final bMs = _timestampMs(b.publishedAt);
      return bMs.compareTo(aMs);
    });
    return rows;
  }

  BlogFeedPost _ownerToFeed(BlogPost post, UserSummary? user) {
    return BlogFeedPost(
      id: post.id,
      title: post.title,
      slug: post.slug,
      summary: post.summary ?? '',
      thumbnailUrl: post.thumbnailUrl,
      publishedAt: post.sortTimestamp,
      author: BlogFeedAuthor(
        username: user?.username ?? widget.username,
        fullName: user?.displayName ?? widget.username,
        profileImg: user?.profileImg ?? '',
      ),
      category: post.category,
      tags: post.tags,
    );
  }

  String _deletedMeta(BlogPost post) {
    final deleted = post.deletedAt;
    if (deleted == null || deleted.isEmpty) return 'In trash';
    final date = DateTime.tryParse(deleted);
    if (date == null) return 'In trash';
    final label = MaterialLocalizations.of(context).formatShortDate(date);
    return 'Deleted $label';
  }

  Future<void> _confirmDelete(BlogPost post) async {
    final token = context.read<AuthState>().accessToken;
    if (token == null) return;

    final ok = await AppConfirmDialog.show(
      context,
      title: 'Move to trash?',
      message:
          'This post will leave the site immediately. You can restore it from Deleted for up to 7 days.',
      confirmLabel: 'Move to trash',
      variant: AppConfirmDialogVariant.warning,
    );
    if (ok != true || !mounted) return;

    try {
      await _api.deletePost(postId: post.id, accessToken: token);
      if (!mounted) return;
      AppFeedbackToast.success(context, 'Post moved to trash');
      await _load();
    } on AuthApiException catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(context, e.message);
    } catch (_) {
      if (!mounted) return;
      AppFeedbackToast.error(context, 'Could not delete post.');
    }
  }

  Future<void> _confirmPurge(BlogPost post) async {
    final token = context.read<AuthState>().accessToken;
    if (token == null) return;

    final ok = await AppConfirmDialog.show(
      context,
      title: 'Delete forever?',
      message: 'This permanently removes the post and cannot be undone.',
      confirmLabel: 'Confirm',
    );
    if (ok != true || !mounted) return;

    try {
      await _api.purgePostPermanent(postId: post.id, accessToken: token);
      if (!mounted) return;
      AppFeedbackToast.success(context, 'Post permanently deleted');
      await _load();
    } on AuthApiException catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(context, e.message);
    } catch (_) {
      if (!mounted) return;
      AppFeedbackToast.error(context, 'Could not delete post.');
    }
  }

  Future<void> _restore(BlogPost post) async {
    final token = context.read<AuthState>().accessToken;
    if (token == null) return;

    setState(() => _restoreBusyId = post.id);
    try {
      await _api.restorePost(postId: post.id, accessToken: token);
      if (!mounted) return;
      AppFeedbackToast.success(context, 'Restored as published');
      setState(() => _tab = _BlogStatusTab.published);
      await _load();
    } on AuthApiException catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(context, e.message);
    } catch (_) {
      if (!mounted) return;
      AppFeedbackToast.error(context, 'Could not restore post.');
    } finally {
      if (mounted) setState(() => _restoreBusyId = null);
    }
  }

  Future<void> _onEdit(BlogPost post) async {
    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      AppFeedbackToast.error(context, 'Not signed in.');
      return;
    }

    try {
      final latest = await _api.getMyPost(postId: post.id, accessToken: token);
      if (!mounted) return;
      final blocks = parseBlogBlocksJson(latest.content);
      final draft = BlogWriteDraft(
        title: latest.title,
        summary: latest.summary ?? '',
        blocks: blocks.isEmpty
            ? [createBlogBlock(BlogBlockType.paragraph)]
            : blocks,
        thumbnailUrl: latest.thumbnailUrl,
        editingPostId: latest.id,
        originalStatus: latest.status,
        categories: [
          if (latest.category != null && latest.category!.trim().isNotEmpty)
            latest.category!.trim(),
        ],
        tags: latest.tags,
      );
      await Navigator.of(context).push<void>(
        MaterialPageRoute<void>(
          builder: (_) => BlogCreateScreen(initialDraft: draft),
        ),
      );
      if (!mounted) return;
      await _load();
    } on AuthApiException catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(context, e.message);
    } catch (_) {
      if (!mounted) return;
      AppFeedbackToast.error(context, 'Could not open editor.');
    }
  }

  ProfileUserBlogCardMode _cardMode() {
    return switch (_tab) {
      _BlogStatusTab.published => ProfileUserBlogCardMode.published,
      _BlogStatusTab.drafts => ProfileUserBlogCardMode.draft,
      _BlogStatusTab.deleted => ProfileUserBlogCardMode.deleted,
    };
  }

  String _countLabel(int count) {
    final noun = switch (_tab) {
      _BlogStatusTab.published => 'published posts',
      _BlogStatusTab.drafts => 'drafts',
      _BlogStatusTab.deleted => 'deleted posts',
    };
    return '$count $noun';
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final user = context.watch<AuthState>().user;

    final ownerFiltered = _isOwner
        ? _sortOwnerPosts(_activeOwnerPosts)
        : const <BlogPost>[];
    final publicFiltered = _isOwner
        ? const <BlogFeedPost>[]
        : _sortPublicPosts(_publicPosts);
    final displayCount = _isOwner
        ? ownerFiltered.length
        : publicFiltered.length;

    return Scaffold(
      backgroundColor: colors.background,
      appBar: const ScreenAppBar(title: 'Blogs'),
      body: AppPullToRefresh(
        onRefresh: _load,
        child: CustomScrollView(
          physics: AppPullToRefresh.scrollPhysics,
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
                child: _UserBlogsToolbarCard(
                  isOwner: _isOwner,
                  tab: _tab,
                  onTabChanged: (tab) => setState(() => _tab = tab),
                  count: displayCount,
                  countLabel: _countLabel(displayCount),
                  primary: primary,
                  colors: colors,
                ),
              ),
            ),
            if (_loading)
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: 20),
                  child: BlogCardListSkeleton(count: 4),
                ),
              )
            else if (_error != null)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: ProfileActivityError(message: _error!, onRetry: _load),
                ),
              )
            else if (_isOwner && ownerFiltered.isEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: ProfileActivityEmpty(
                    icon: switch (_tab) {
                      _BlogStatusTab.published => Icons.article_outlined,
                      _BlogStatusTab.drafts => Icons.edit_note_rounded,
                      _BlogStatusTab.deleted => Icons.delete_outline_rounded,
                    },
                    title: switch (_tab) {
                      _BlogStatusTab.published => 'No published posts',
                      _BlogStatusTab.drafts => 'No drafts',
                      _BlogStatusTab.deleted => 'Trash is empty',
                    },
                    message: switch (_tab) {
                      _BlogStatusTab.published =>
                        'Publish from the write workspace.',
                      _BlogStatusTab.drafts =>
                        'Autosave keeps drafts while you write.',
                      _BlogStatusTab.deleted =>
                        'Deleted posts stay here for 7 days.',
                    },
                  ),
                ),
              )
            else if (!_isOwner && publicFiltered.isEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: ProfileActivityEmpty(
                    icon: Icons.article_outlined,
                    title: 'No published posts',
                    message: 'This author has not published yet.',
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
                sliver: SliverList.separated(
                  itemCount: _isOwner
                      ? ownerFiltered.length
                      : publicFiltered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 16),
                  itemBuilder: (context, index) {
                    if (_isOwner) {
                      final post = ownerFiltered[index];
                      final feed = _ownerToFeed(post, user);
                      final mode = _cardMode();
                      return ProfileUserBlogCard(
                        post: feed,
                        mode: mode,
                        deletedMeta: mode == ProfileUserBlogCardMode.deleted
                            ? _deletedMeta(post)
                            : null,
                        restoreBusy: _restoreBusyId == post.id,
                        onOpen: mode == ProfileUserBlogCardMode.published
                            ? () => openBlogFeedPost(context, feed)
                            : () {},
                        onEdit: () => _onEdit(post),
                        onDelete: () => _confirmDelete(post),
                        onRestore: () => _restore(post),
                        onPurge: () => _confirmPurge(post),
                      );
                    }

                    final post = publicFiltered[index];
                    return BlogCard(
                      post: post,
                      onTap: () => openBlogFeedPost(context, post),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _UserBlogsToolbarCard extends StatelessWidget {
  const _UserBlogsToolbarCard({
    required this.isOwner,
    required this.tab,
    required this.onTabChanged,
    required this.count,
    required this.countLabel,
    required this.primary,
    required this.colors,
  });

  final bool isOwner;
  final _BlogStatusTab tab;
  final ValueChanged<_BlogStatusTab> onTabChanged;
  final int count;
  final String countLabel;
  final Color primary;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colors.card,
        border: Border.all(color: colors.border, width: 2),
        boxShadow: [
          BoxShadow(
            color: colors.shadow.withValues(alpha: 0.1),
            offset: const Offset(3, 3),
            blurRadius: 0,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      if (isOwner) ...[
                        _StatusTabChip(
                          label: 'Published',
                          icon: Icons.article_outlined,
                          active: tab == _BlogStatusTab.published,
                          onTap: () => onTabChanged(_BlogStatusTab.published),
                          primary: primary,
                          colors: colors,
                        ),
                        const SizedBox(width: 8),
                        _StatusTabChip(
                          label: 'Drafts',
                          icon: Icons.edit_note_rounded,
                          active: tab == _BlogStatusTab.drafts,
                          onTap: () => onTabChanged(_BlogStatusTab.drafts),
                          primary: primary,
                          colors: colors,
                        ),
                        const SizedBox(width: 8),
                        _StatusTabChip(
                          label: 'Deleted',
                          icon: Icons.delete_outline_rounded,
                          active: tab == _BlogStatusTab.deleted,
                          onTap: () => onTabChanged(_BlogStatusTab.deleted),
                          primary: primary,
                          colors: colors,
                        ),
                      ] else
                        Text(
                          'PUBLISHED',
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.1,
                            color: colors.foreground,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ProfileCountPill(count: count, semanticLabel: countLabel),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatusTabChip extends StatelessWidget {
  const _StatusTabChip({
    required this.label,
    required this.icon,
    required this.active,
    required this.onTap,
    required this.primary,
    required this.colors,
  });

  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback onTap;
  final Color primary;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: active ? primary : colors.card,
      child: InkWell(
        canRequestFocus: false,
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            border: Border.all(
              color: active ? primary : colors.border.withValues(alpha: 0.65),
              width: 2,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (active) ...[
                Icon(icon, size: 14, color: colors.primaryForeground),
                const SizedBox(width: 6),
              ],
              Text(
                label.toUpperCase(),
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.8,
                  color: active
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
