import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/blog_feed_post.dart';
import '../../services/auth_api.dart';
import '../../services/blog_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/blog_card_format.dart';
import '../../utils/resolve_profile_media_url.dart';
import '../../utils/taxonomy_navigation.dart';
import '../../utils/profile_navigation.dart';
import '../ui/app_feedback_toast.dart';

/// Cover image block height inside [BlogCard].
const kBlogCardCoverHeight = 160.0;

/// Fixed width for horizontal feed lanes (trending categories, etc.).
const kBlogCardLaneWidth = 300.0;

/// Natural [BlogCard] height — cover + padded meta (2-line title, author, engagement).
const kBlogCardLaneHeight = 310.0;

/// Squad feed share overlay — mirrors webapp `SquadFeedShareChrome`.
class BlogCardShareChrome {
  const BlogCardShareChrome({
    required this.username,
    this.fullName,
    this.profileImg,
  });

  final String username;
  final String? fullName;
  final String? profileImg;
}

/// Reusable blog feed card — mirrors webapp `BlogCard`.
class BlogCard extends StatefulWidget {
  const BlogCard({
    super.key,
    required this.post,
    required this.onTap,
    this.showEngagement = true,
    this.interactiveEngagement = true,
    this.onPostChanged,
    this.shareChrome,
  });

  final BlogFeedPost post;
  final VoidCallback onTap;
  final bool showEngagement;
  final bool interactiveEngagement;
  final ValueChanged<BlogFeedPost>? onPostChanged;
  final BlogCardShareChrome? shareChrome;

  @override
  State<BlogCard> createState() => _BlogCardState();
}

enum _BlogCardEngagementBusy { respect, repost, bookmark }

class _BlogCardState extends State<BlogCard> {
  final _api = BlogApi();
  late BlogFeedPost _post;
  _BlogCardEngagementBusy? _busy;

  @override
  void initState() {
    super.initState();
    _post = widget.post;
  }

  @override
  void didUpdateWidget(covariant BlogCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.post.id != _post.id ||
        widget.post.viewerHasRespected != _post.viewerHasRespected ||
        widget.post.respectCount != _post.respectCount ||
        widget.post.viewerHasReposted != _post.viewerHasReposted ||
        widget.post.repostCount != _post.repostCount ||
        widget.post.viewerHasBookmarked != _post.viewerHasBookmarked ||
        widget.post.bookmarkCount != _post.bookmarkCount ||
        widget.post.viewCount != _post.viewCount) {
      _post = widget.post;
    }
  }

  void _emitPost(BlogFeedPost next) {
    setState(() => _post = next);
    widget.onPostChanged?.call(next);
  }

  String? _requireToken() {
    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      AppFeedbackToast.warning(context, 'Sign in to interact with this post.');
      return null;
    }
    return token;
  }

  Future<void> _toggleRespect() async {
    if (!widget.interactiveEngagement || _busy != null) return;
    final token = _requireToken();
    if (token == null) return;

    final username = _post.author.username.trim();
    final slug = _post.slug.trim();
    if (username.isEmpty || slug.isEmpty) return;

    final wantOn = !_post.viewerHasRespected;
    setState(() => _busy = _BlogCardEngagementBusy.respect);
    try {
      final result = await _api.setPostRespect(
        username: username,
        slug: slug,
        respecting: wantOn,
        accessToken: token,
      );
      if (!mounted) return;
      _emitPost(_post.copyWith(
        viewerHasRespected: result.respecting,
        respectCount: result.respectCount,
      ));
      if (wantOn && !result.respecting) {
        AppFeedbackToast.warning(context, 'You can\'t Respect your own post.');
      }
    } on AuthApiException catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(context, e.message);
    } catch (_) {
      if (!mounted) return;
      AppFeedbackToast.error(context, 'Could not update Respect.');
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  Future<void> _toggleRepost() async {
    if (!widget.interactiveEngagement || _busy != null) return;
    final token = _requireToken();
    if (token == null) return;

    final username = _post.author.username.trim();
    final slug = _post.slug.trim();
    if (username.isEmpty || slug.isEmpty) return;

    final wantOn = !_post.viewerHasReposted;
    setState(() => _busy = _BlogCardEngagementBusy.repost);
    try {
      final result = await _api.setPostRepost(
        username: username,
        slug: slug,
        reposting: wantOn,
        accessToken: token,
      );
      if (!mounted) return;
      _emitPost(_post.copyWith(
        viewerHasReposted: result.active,
        repostCount: result.count,
      ));
      if (wantOn && !result.active) {
        AppFeedbackToast.warning(context, 'You can\'t Repost your own post.');
      }
    } on AuthApiException catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(context, e.message);
    } catch (_) {
      if (!mounted) return;
      AppFeedbackToast.error(context, 'Could not update repost.');
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  Future<void> _toggleBookmark() async {
    if (!widget.interactiveEngagement || _busy != null) return;
    final token = _requireToken();
    if (token == null) return;

    final username = _post.author.username.trim();
    final slug = _post.slug.trim();
    if (username.isEmpty || slug.isEmpty) return;

    final wantOn = !_post.viewerHasBookmarked;
    setState(() => _busy = _BlogCardEngagementBusy.bookmark);
    try {
      final result = await _api.setPostBookmark(
        username: username,
        slug: slug,
        bookmarked: wantOn,
        accessToken: token,
      );
      if (!mounted) return;
      _emitPost(_post.copyWith(
        viewerHasBookmarked: result.active,
        bookmarkCount: result.count,
      ));
    } on AuthApiException catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(context, e.message);
    } catch (_) {
      if (!mounted) return;
      AppFeedbackToast.error(context, 'Could not update bookmark.');
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final post = _post;
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final onPrimary = colors.primaryForeground;
    final coverUrl = resolveProfileMediaUrl(post.thumbnailUrl);
    final categorySlug = post.category?.trim() ?? '';
    final categoryLabel = blogCategoryLabel(post).toUpperCase();
    final readMinutes = blogReadMinutes(post);
    final displayTitle = titleCaseEveryWord(post.title);
    final ageLabel = blogCardAgeLabel(post.publishedAt);
    final authorName = (post.author.fullName.trim().isNotEmpty
            ? post.author.fullName.trim()
            : post.author.username.trim())
        .toUpperCase();
    final authorUsername = post.author.username.trim();
    final avatarUrl = resolveProfileMediaUrl(post.author.profileImg);

    return Material(
      color: colors.card,
      child: InkWell(
        onTap: widget.onTap,
        child: Container(
          decoration: BoxDecoration(
            border: Border.all(color: colors.border, width: 3),
            boxShadow: [
              BoxShadow(
                color: colors.shadow.withValues(alpha: 0.14),
                offset: const Offset(4, 4),
                blurRadius: 0,
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _Cover(
                coverUrl: coverUrl,
                colors: colors,
                primary: primary,
                onPrimary: onPrimary,
                shareChrome: widget.shareChrome,
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 10, 10, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        _CategoryBadge(
                          label: categoryLabel,
                          slug: categorySlug,
                          displayName: blogCategoryLabel(post),
                          primary: primary,
                          onPrimary: onPrimary,
                        ),
                        const Spacer(),
                        Text(
                          '$readMinutes min',
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 8,
                            fontWeight: FontWeight.w700,
                            color: colors.mutedForeground,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      displayTitle,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        height: 1.25,
                        letterSpacing: -0.2,
                        color: colors.foreground,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: authorUsername.isEmpty
                                  ? null
                                  : () => openPublicProfile(
                                        context,
                                        username: authorUsername,
                                      ),
                              child: Row(
                                children: [
                                  _AuthorAvatar(
                                    imageUrl: avatarUrl,
                                    label: authorName,
                                    colors: colors,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          authorName,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: GoogleFonts.inter(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w700,
                                            letterSpacing: 0.4,
                                            color: colors.foreground,
                                          ),
                                        ),
                                        if (ageLabel.isNotEmpty) ...[
                                          const SizedBox(height: 2),
                                          Row(
                                            children: [
                                              Icon(
                                                Icons.calendar_today_outlined,
                                                size: 10,
                                                color: colors.mutedForeground.withValues(alpha: 0.8),
                                              ),
                                              const SizedBox(width: 4),
                                              Expanded(
                                                child: Text(
                                                  ageLabel,
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                  style: GoogleFonts.inter(
                                                    fontSize: 8,
                                                    fontWeight: FontWeight.w600,
                                                    letterSpacing: 0.5,
                                                    color: colors.mutedForeground,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        if (widget.showEngagement) ...[
                          const SizedBox(width: 8),
                          _EngagementRail(
                            post: post,
                            colors: colors,
                            primary: primary,
                            interactive: widget.interactiveEngagement,
                            busy: _busy,
                            onRespect: _toggleRespect,
                            onRepost: _toggleRepost,
                            onBookmark: _toggleBookmark,
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Cover extends StatelessWidget {
  const _Cover({
    required this.coverUrl,
    required this.colors,
    required this.primary,
    required this.onPrimary,
    this.shareChrome,
  });

  final String coverUrl;
  final AppColorTokens colors;
  final Color primary;
  final Color onPrimary;
  final BlogCardShareChrome? shareChrome;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: kBlogCardCoverHeight,
      child: Stack(
        fit: StackFit.expand,
        children: [
          DecoratedBox(
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: colors.border, width: 3)),
              color: colors.muted.withValues(alpha: 0.15),
            ),
            child: coverUrl.isNotEmpty
                ? Image.network(
                    coverUrl,
                    fit: BoxFit.cover,
                    width: double.infinity,
                    height: double.infinity,
                    errorBuilder: (_, _, _) => _CoverFallback(colors: colors, primary: primary),
                  )
                : _CoverFallback(colors: colors, primary: primary),
          ),
          if (shareChrome != null)
            _SquadShareBadge(
              chrome: shareChrome!,
              primary: primary,
              onPrimary: onPrimary,
            ),
        ],
      ),
    );
  }
}

class _SquadShareBadge extends StatelessWidget {
  const _SquadShareBadge({
    required this.chrome,
    required this.primary,
    required this.onPrimary,
  });

  final BlogCardShareChrome chrome;
  final Color primary;
  final Color onPrimary;

  @override
  Widget build(BuildContext context) {
    final avatarUrl = resolveProfileMediaUrl(chrome.profileImg);
    final username = chrome.username.trim();
    final label = chrome.fullName?.trim().isNotEmpty == true
        ? chrome.fullName!.trim()
        : username;
    final initial = label.isNotEmpty ? label[0].toUpperCase() : '?';

    return Positioned(
      left: 8,
      top: 8,
      right: 8,
      child: Align(
        alignment: Alignment.topLeft,
        child: ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 4, sigmaY: 4),
            child: DecoratedBox(
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white.withValues(alpha: 0.9), width: 2),
                color: Colors.black.withValues(alpha: 0.55),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 22,
                      height: 22,
                      alignment: Alignment.center,
                      color: primary,
                      child: Icon(Icons.repeat_rounded, size: 14, color: onPrimary),
                    ),
                    const SizedBox(width: 6),
                    SizedBox(
                      width: 24,
                      height: 24,
                      child: avatarUrl.isNotEmpty
                          ? Image.network(
                              avatarUrl,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => _ShareAvatarFallback(initial: initial),
                            )
                          : _ShareAvatarFallback(initial: initial),
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        username.isNotEmpty ? '@$username' : '@member',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.jetBrainsMono(
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.3,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ShareAvatarFallback extends StatelessWidget {
  const _ShareAvatarFallback({required this.initial});

  final String initial;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.white.withValues(alpha: 0.15),
      child: Center(
        child: Text(
          initial,
          style: GoogleFonts.jetBrainsMono(
            fontSize: 9,
            fontWeight: FontWeight.w900,
            color: Colors.white,
          ),
        ),
      ),
    );
  }
}

class _CoverFallback extends StatelessWidget {
  const _CoverFallback({required this.colors, required this.primary});

  final AppColorTokens colors;
  final Color primary;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            primary.withValues(alpha: 0.18),
            colors.muted.withValues(alpha: 0.35),
          ],
        ),
      ),
      child: Center(
        child: Icon(
          Icons.article_outlined,
          size: 40,
          color: primary.withValues(alpha: 0.55),
        ),
      ),
    );
  }
}

class _AuthorAvatar extends StatelessWidget {
  const _AuthorAvatar({
    required this.imageUrl,
    required this.label,
    required this.colors,
  });

  final String imageUrl;
  final String label;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        border: Border.all(color: colors.border, width: 2),
        color: colors.muted.withValues(alpha: 0.3),
      ),
      clipBehavior: Clip.hardEdge,
      child: imageUrl.isNotEmpty
          ? Image.network(
              imageUrl,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => _LetterFallback(label: label, colors: colors),
            )
          : _LetterFallback(label: label, colors: colors),
    );
  }
}

class _LetterFallback extends StatelessWidget {
  const _LetterFallback({required this.label, required this.colors});

  final String label;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final letter = label.isNotEmpty ? label[0] : '?';
    return Center(
      child: Text(
        letter,
        style: GoogleFonts.inter(
          fontSize: 10,
          fontWeight: FontWeight.w900,
          color: colors.mutedForeground,
        ),
      ),
    );
  }
}

class _EngagementRail extends StatelessWidget {
  const _EngagementRail({
    required this.post,
    required this.colors,
    required this.primary,
    required this.interactive,
    required this.busy,
    required this.onRespect,
    required this.onRepost,
    required this.onBookmark,
  });

  final BlogFeedPost post;
  final AppColorTokens colors;
  final Color primary;
  final bool interactive;
  final _BlogCardEngagementBusy? busy;
  final VoidCallback onRespect;
  final VoidCallback onRepost;
  final VoidCallback onBookmark;

  @override
  Widget build(BuildContext context) {
    final chips = <Widget>[
      _StatChip(
        iconWidget: SvgPicture.asset(
          'assets/icons/lightning-bolt.svg',
          width: 14,
          height: 14,
        ),
        count: post.respectCount,
        active: post.viewerHasRespected,
        colors: colors,
        primary: primary,
        onTap: interactive ? onRespect : null,
        disabled: busy != null,
        busy: busy == _BlogCardEngagementBusy.respect,
      ),
      _StatChip(
        icon: Icons.repeat_rounded,
        count: post.repostCount,
        active: post.viewerHasReposted,
        colors: colors,
        primary: primary,
        onTap: interactive ? onRepost : null,
        disabled: busy != null,
        busy: busy == _BlogCardEngagementBusy.repost,
      ),
      _StatChip(
        icon: post.viewerHasBookmarked
            ? Icons.bookmark_rounded
            : Icons.bookmark_border_rounded,
        count: post.bookmarkCount,
        active: post.viewerHasBookmarked,
        colors: colors,
        primary: primary,
        onTap: interactive ? onBookmark : null,
        disabled: busy != null,
        busy: busy == _BlogCardEngagementBusy.bookmark,
      ),
      _StatChip(
        icon: Icons.visibility_outlined,
        count: post.viewCount,
        active: false,
        colors: colors,
        primary: primary,
      ),
    ];

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < chips.length; i++) ...[
          if (i > 0) _EngagementDot(colors: colors),
          chips[i],
        ],
      ],
    );
  }
}

class _EngagementDot extends StatelessWidget {
  const _EngagementDot({required this.colors});

  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 3,
      height: 3,
      margin: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: colors.mutedForeground.withValues(alpha: 0.4),
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({
    required this.count,
    required this.active,
    required this.colors,
    required this.primary,
    this.icon,
    this.iconWidget,
    this.onTap,
    this.disabled = false,
    this.busy = false,
  });

  final IconData? icon;
  final Widget? iconWidget;
  final int count;
  final bool active;
  final AppColorTokens colors;
  final Color primary;
  final VoidCallback? onTap;
  final bool disabled;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final iconColor = active ? primary : colors.mutedForeground;
    final opacity = disabled && !busy ? 0.55 : 1.0;

    final chip = Opacity(
      opacity: opacity,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
            child: iconWidget ??
                Icon(icon, size: 14, color: iconColor),
          ),
          if (count > 0)
            Positioned(
              right: -7,
              top: -7,
              child: _EngagementCountBubble(
                count: count,
                colors: colors,
                primary: primary,
              ),
            ),
        ],
      ),
    );

    if (onTap == null) return chip;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: disabled ? null : onTap,
        borderRadius: BorderRadius.circular(4),
        child: chip,
      ),
    );
  }
}

class _EngagementCountBubble extends StatelessWidget {
  const _EngagementCountBubble({
    required this.count,
    required this.colors,
    required this.primary,
  });

  final int count;
  final AppColorTokens colors;
  final Color primary;

  @override
  Widget build(BuildContext context) {
    final text = count > 99 ? '99+' : count.toString();
    return Container(
      constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
      padding: const EdgeInsets.symmetric(horizontal: 2),
      decoration: BoxDecoration(
        color: primary,
        border: Border.all(color: colors.border, width: 1.5),
      ),
      alignment: Alignment.center,
      child: Text(
        text,
        style: GoogleFonts.jetBrainsMono(
          fontSize: 6,
          fontWeight: FontWeight.w800,
          height: 1,
          color: colors.primaryForeground,
        ),
      ),
    );
  }
}

class _CategoryBadge extends StatelessWidget {
  const _CategoryBadge({
    required this.label,
    required this.slug,
    required this.displayName,
    required this.primary,
    required this.onPrimary,
  });

  final String label;
  final String slug;
  final String displayName;
  final Color primary;
  final Color onPrimary;

  @override
  Widget build(BuildContext context) {
    final badge = Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: primary,
        border: Border.all(color: primary, width: 2),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: GoogleFonts.inter(
          fontSize: 9,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.6,
          color: onPrimary,
        ),
      ),
    );

    if (slug.isEmpty) return badge;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => openCategoryFromSlug(
          context,
          slug: slug,
          name: displayName,
        ),
        child: badge,
      ),
    );
  }
}
