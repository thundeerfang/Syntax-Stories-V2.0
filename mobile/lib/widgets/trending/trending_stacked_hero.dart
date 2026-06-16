import 'dart:async';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/trending_config.dart';
import '../../models/blog_feed_post.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/blog_card_format.dart';
import '../../utils/resolve_profile_media_url.dart';
import 'trending_hero_skeleton.dart';

class TrendingStackedHero extends StatefulWidget {
  const TrendingStackedHero({
    super.key,
    required this.posts,
    required this.loading,
    this.error,
    required this.onRetry,
    required this.onOpenPost,
    this.onBrowseTopics,
  });

  final List<BlogFeedPost> posts;
  final bool loading;
  final String? error;
  final VoidCallback onRetry;
  final void Function(BlogFeedPost post) onOpenPost;
  final VoidCallback? onBrowseTopics;

  static const stageHeight = 300.0;

  @override
  State<TrendingStackedHero> createState() => _TrendingStackedHeroState();
}

class _TrendingStackedHeroState extends State<TrendingStackedHero> {
  static const _animDuration = Duration(milliseconds: 560);
  static const _animCurve = Curves.easeInOutCubicEmphasized;
  static const _autoplayDelay = Duration(milliseconds: kTrendingAutoplayMs);
  static const _manualCooldown = Duration(milliseconds: kTrendingAutoplayMs + 560);
  static const _swipeVelocityThreshold = 200.0;

  int _active = 0;
  bool _isTransitioning = false;
  bool _pointerDown = false;
  bool _hoverPaused = false;
  double _dragDeltaX = 0;
  double _dragDeltaY = 0;
  int _transitionDir = 1;
  Timer? _autoplay;

  @override
  void initState() {
    super.initState();
    _scheduleAutoplay();
  }

  @override
  void didUpdateWidget(covariant TrendingStackedHero oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.posts.length != widget.posts.length) {
      _active = 0;
      _isTransitioning = false;
    }
    if (widget.posts.length > 1) {
      _scheduleAutoplay();
    } else {
      _autoplay?.cancel();
    }
  }

  @override
  void dispose() {
    _autoplay?.cancel();
    super.dispose();
  }

  bool get _autoplayBlocked => _pointerDown || _hoverPaused || _isTransitioning;

  void _scheduleAutoplay({Duration? delay}) {
    _autoplay?.cancel();
    if (widget.posts.length <= 1) return;

    _autoplay = Timer(delay ?? _autoplayDelay, () {
      if (!mounted || _autoplayBlocked) {
        _scheduleAutoplay(delay: const Duration(milliseconds: 400));
        return;
      }
      _advanceBy(1, manual: false);
    });
  }

  void _onManualInteraction() {
    _autoplay?.cancel();
    _scheduleAutoplay(delay: _manualCooldown);
  }

  void _advanceBy(int dir, {required bool manual}) {
    if (_isTransitioning) return;
    final n = widget.posts.length;
    if (n <= 1) return;

    final next = (_active + dir + n) % n;
    if (next == _active) return;

    _autoplay?.cancel();
    _isTransitioning = true;
    _transitionDir = dir > 0 ? 1 : -1;
    setState(() => _active = next);

    if (manual) {
      _onManualInteraction();
    }

    Future.delayed(_animDuration, () {
      if (!mounted) return;
      _isTransitioning = false;
      if (!manual) {
        _scheduleAutoplay();
      }
    });
  }

  void _go(int dir) => _advanceBy(dir, manual: true);

  void _promote(int depth) {
    if (depth <= 0 || _isTransitioning) return;
    _advanceBy(depth, manual: true);
  }

  void _onPointerDown() {
    _pointerDown = true;
    _autoplay?.cancel();
  }

  void _onPointerUp() {
    _pointerDown = false;
    if (!_isTransitioning) {
      _scheduleAutoplay(delay: _manualCooldown);
    }
  }

  void _onHorizontalDragStart(DragStartDetails details) {
    _dragDeltaX = 0;
    _dragDeltaY = 0;
    _onPointerDown();
  }

  void _onHorizontalDragUpdate(DragUpdateDetails details) {
    _dragDeltaX += details.delta.dx;
    _dragDeltaY += details.delta.dy;
  }

  void _finishHorizontalSwipe(double velocity) {
    if (widget.posts.length <= 1) {
      _dragDeltaX = 0;
      _dragDeltaY = 0;
      return;
    }

    final delta = _dragDeltaX;
    final horizontal =
        delta.abs() >= _dragDeltaY.abs() || delta.abs() >= kTrendingHeroSwipeOffsetThreshold;

    if (horizontal) {
      if (delta <= -kTrendingHeroSwipeOffsetThreshold) {
        _go(1);
      } else if (delta >= kTrendingHeroSwipeOffsetThreshold) {
        _go(-1);
      } else if (velocity <= -_swipeVelocityThreshold) {
        _go(1);
      } else if (velocity >= _swipeVelocityThreshold) {
        _go(-1);
      }
    }

    _dragDeltaX = 0;
    _dragDeltaY = 0;
  }

  void _onPanStart(DragStartDetails details) => _onHorizontalDragStart(details);

  void _onPanUpdate(DragUpdateDetails details) => _onHorizontalDragUpdate(details);

  void _onPanEnd(DragEndDetails details) {
    _finishHorizontalSwipe(details.velocity.pixelsPerSecond.dx);
    _onPointerUp();
  }

  void _onPanCancel() {
    _dragDeltaX = 0;
    _dragDeltaY = 0;
    _onPointerUp();
  }

  Widget _buildSwipeableHeroStage({
    required int n,
    required int safe,
    required int visible,
  }) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 12, 0, 8),
      child: MouseRegion(
        onEnter: (_) => setState(() {
          _hoverPaused = true;
          _autoplay?.cancel();
        }),
        onExit: (_) {
          setState(() => _hoverPaused = false);
          if (!_pointerDown && !_isTransitioning) {
            _scheduleAutoplay(delay: _manualCooldown);
          }
        },
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          dragStartBehavior: DragStartBehavior.down,
          onPanStart: _onPanStart,
          onPanUpdate: _onPanUpdate,
          onPanEnd: _onPanEnd,
          onPanCancel: _onPanCancel,
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: kTrendingPageHorizontalPadding,
            ),
            child: SizedBox(
              height: TrendingStackedHero.stageHeight,
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final width = constraints.maxWidth;
                  return Stack(
                    clipBehavior: Clip.none,
                    children: [
                      for (var d = visible - 1; d >= 0; d--)
                        _StackedHeroCard(
                          key: ValueKey(
                            widget.posts[(safe + d) % n].id.isNotEmpty
                                ? widget.posts[(safe + d) % n].id
                                : '${widget.posts[(safe + d) % n].slug}-${(safe + d) % n}',
                          ),
                          post: widget.posts[(safe + d) % n],
                          depth: d,
                          rank: ((safe + d) % n) + 1,
                          stageWidth: width,
                          isFront: d == 0,
                          animDuration: _animDuration,
                          animCurve: _animCurve,
                          transitionDir: d == 0 ? _transitionDir : 0,
                          onTap: () {
                            if (d == 0) {
                              widget.onOpenPost(widget.posts[safe]);
                            } else {
                              _promote(d);
                            }
                          },
                        ),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.loading) {
      return Padding(
        padding: EdgeInsets.fromLTRB(
          kTrendingPageHorizontalPadding,
          12,
          kTrendingPageHorizontalPadding,
          8,
        ),
        child: const TrendingHeroSkeleton(),
      );
    }

    if (widget.error != null) {
      return Padding(
        padding: EdgeInsets.fromLTRB(
          kTrendingPageHorizontalPadding,
          12,
          kTrendingPageHorizontalPadding,
          8,
        ),
        child: _TrendingHeroMessage(
          icon: Icons.error_outline_rounded,
          title: 'Could not load trending',
          message: widget.error!,
          actionLabel: 'Try again',
          onAction: widget.onRetry,
        ),
      );
    }

    if (widget.posts.isEmpty) {
      return Padding(
        padding: EdgeInsets.fromLTRB(
          kTrendingPageHorizontalPadding,
          12,
          kTrendingPageHorizontalPadding,
          8,
        ),
        child: _TrendingHeroMessage(
          icon: Icons.layers_outlined,
          title: 'No published posts yet',
          message: 'When writers publish, trending picks will stack here.',
          actionLabel: widget.onBrowseTopics != null ? 'Browse topics' : null,
          onAction: widget.onBrowseTopics,
        ),
      );
    }

    final n = widget.posts.length;
    final safe = n > 0 ? _active % n : 0;
    final visible = n < kTrendingStackDepth ? n : kTrendingStackDepth;

    return _buildSwipeableHeroStage(n: n, safe: safe, visible: visible);
  }
}

class _StackedHeroCard extends StatelessWidget {
  const _StackedHeroCard({
    super.key,
    required this.post,
    required this.depth,
    required this.rank,
    required this.stageWidth,
    required this.isFront,
    required this.animDuration,
    required this.animCurve,
    this.transitionDir = 0,
    required this.onTap,
  });

  final BlogFeedPost post;
  final int depth;
  final int rank;
  final double stageWidth;
  final bool isFront;
  final Duration animDuration;
  final Curve animCurve;
  final int transitionDir;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final coverUrl = resolveProfileMediaUrl(post.thumbnailUrl);
    final categoryLabel = blogCategoryLabel(post).toUpperCase();
    final title = titleCaseEveryWord(post.title);
    final authorName = post.author.fullName.trim().isNotEmpty
        ? post.author.fullName.trim()
        : post.author.username.trim();
    final avatarUrl = resolveProfileMediaUrl(post.author.profileImg);

    final backPeek = kTrendingHeroBackPeekWidth.clamp(0.0, stageWidth * 0.28);
    final cardWidth = isFront ? stageWidth - backPeek : stageWidth;
    final stackOpacity = isFront ? 1.0 : 0.92;
    final scale = isFront ? 1.0 : 0.97;
    final slideBegin = transitionDir > 0
        ? (backPeek / stageWidth)
        : transitionDir < 0
            ? -0.1
            : 0.0;

    Widget card = Material(
      elevation: isFront ? 6.0 : (2.0 - depth).clamp(0.0, 2.0),
      shadowColor: colors.shadow.withValues(alpha: 0.25),
      child: InkWell(
        onTap: onTap,
        child: AnimatedContainer(
          duration: animDuration,
          curve: animCurve,
          height: TrendingStackedHero.stageHeight,
          decoration: BoxDecoration(
            border: Border.all(
              color: isFront ? colors.border : colors.border.withValues(alpha: 0.65),
              width: 2,
            ),
            color: colors.muted.withValues(alpha: 0.2),
          ),
          child: _buildCardBody(
            colors: colors,
            primary: primary,
            coverUrl: coverUrl,
            categoryLabel: categoryLabel,
            authorName: authorName,
            avatarUrl: avatarUrl,
            title: title,
          ),
        ),
      ),
    );

    if (isFront && transitionDir != 0) {
      card = TweenAnimationBuilder<double>(
        key: ValueKey('slide-$transitionDir-${post.id}'),
        tween: Tween(begin: slideBegin, end: 0),
        duration: animDuration,
        curve: animCurve,
        builder: (context, slide, child) {
          return Transform.translate(
            offset: Offset(slide * stageWidth, 0),
            child: child,
          );
        },
        child: card,
      );
    }

    return AnimatedPositioned(
      duration: animDuration,
      curve: animCurve,
      left: 0,
      top: TrendingStackedHero.stageHeight * 0.5,
      width: cardWidth,
      child: AnimatedScale(
        duration: animDuration,
        curve: animCurve,
        scale: scale,
        alignment: Alignment.centerLeft,
        child: Transform.translate(
          offset: Offset(0, -TrendingStackedHero.stageHeight * 0.5),
          child: AnimatedOpacity(
            duration: animDuration,
            curve: animCurve,
            opacity: stackOpacity,
            child: card,
          ),
        ),
      ),
    );
  }

  Widget _buildCardBody({
    required AppColorTokens colors,
    required Color primary,
    required String coverUrl,
    required String categoryLabel,
    required String authorName,
    required String avatarUrl,
    required String title,
  }) {
    return Stack(
      fit: StackFit.expand,
      children: [
        if (coverUrl.isNotEmpty)
          Image.network(
            coverUrl,
            fit: BoxFit.cover,
            errorBuilder: (_, _, _) => _CoverFallback(colors: colors, primary: primary),
          )
        else
          _CoverFallback(colors: colors, primary: primary),
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: isFront
                  ? [
                      Colors.transparent,
                      Colors.black.withValues(alpha: 0.48),
                      Colors.black.withValues(alpha: 0.9),
                    ]
                  : [
                      Colors.black.withValues(alpha: 0.05),
                      Colors.black.withValues(alpha: 0.26),
                      Colors.black.withValues(alpha: 0.7),
                    ],
              stops: isFront ? const [0.34, 0.62, 1.0] : const [0.0, 0.45, 1.0],
            ),
          ),
        ),
        Positioned(
          left: 8,
          top: 8,
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: isFront ? 180 : 96),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: primary,
                border: Border.all(color: primary, width: 2),
              ),
              child: Text(
                categoryLabel,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.6,
                  color: colors.primaryForeground,
                ),
              ),
            ),
          ),
        ),
        Positioned(
          right: 8,
          top: 8,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: colors.background,
              border: Border.all(color: colors.border, width: 2),
            ),
            child: Text(
              '#$rank',
              style: GoogleFonts.jetBrainsMono(
                fontSize: 10,
                fontWeight: FontWeight.w900,
                color: colors.foreground,
              ),
            ),
          ),
        ),
        Positioned(
          left: 12,
          right: 12,
          bottom: 12,
          child: _HeroEngagementStrip(
            post: post,
            authorName: authorName,
            avatarUrl: avatarUrl,
            title: title,
            compact: !isFront,
          ),
        ),
      ],
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
          colors: [
            primary.withValues(alpha: 0.2),
            colors.muted.withValues(alpha: 0.35),
          ],
        ),
      ),
      child: Center(
        child: Icon(Icons.article_outlined, size: 40, color: primary.withValues(alpha: 0.55)),
      ),
    );
  }
}

class _HeroEngagementStrip extends StatelessWidget {
  const _HeroEngagementStrip({
    required this.post,
    required this.authorName,
    required this.avatarUrl,
    required this.title,
    required this.compact,
  });

  final BlogFeedPost post;
  final String authorName;
  final String avatarUrl;
  final String title;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final excerpt = post.summary.trim();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            _HeroAvatar(url: avatarUrl, label: authorName),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    authorName.toUpperCase(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                    ),
                  ),
                  if (post.author.username.trim().isNotEmpty)
                    Text(
                      '@${post.author.username.trim().toUpperCase()}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.jetBrainsMono(
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        color: Colors.white.withValues(alpha: 0.75),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          title,
          maxLines: compact ? 1 : 2,
          overflow: TextOverflow.ellipsis,
          style: GoogleFonts.inter(
            fontSize: compact ? 12 : 16,
            fontWeight: FontWeight.w900,
            height: 1.2,
            color: Colors.white,
          ),
        ),
        if (!compact && excerpt.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            excerpt,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.jetBrainsMono(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              height: 1.35,
              color: Colors.white.withValues(alpha: 0.8),
            ),
          ),
        ],
        if (!compact) ...[
          const SizedBox(height: 6),
          _HeroStatsRow(post: post),
        ],
      ],
    );
  }
}

class _HeroAvatar extends StatelessWidget {
  const _HeroAvatar({required this.url, required this.label});

  final String url;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        border: Border.all(color: Colors.white.withValues(alpha: 0.9), width: 2),
        color: Colors.white.withValues(alpha: 0.15),
      ),
      clipBehavior: Clip.hardEdge,
      child: url.isNotEmpty
          ? Image.network(url, fit: BoxFit.cover, errorBuilder: (_, _, _) => _Letter(label: label))
          : _Letter(label: label),
    );
  }
}

class _Letter extends StatelessWidget {
  const _Letter({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        label.isNotEmpty ? label[0].toUpperCase() : '?',
        style: GoogleFonts.jetBrainsMono(fontSize: 12, fontWeight: FontWeight.w900, color: Colors.white),
      ),
    );
  }
}

class _HeroStatsRow extends StatelessWidget {
  const _HeroStatsRow({required this.post});

  final BlogFeedPost post;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 6,
      runSpacing: 2,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        _HeroStat(
          icon: SvgPicture.asset('assets/icons/lightning-bolt.svg', width: 14, height: 14),
          count: post.respectCount,
        ),
        _HeroStat(
          icon: Icon(Icons.repeat_rounded, size: 14, color: Colors.white.withValues(alpha: 0.95)),
          count: post.repostCount,
        ),
        _HeroStat(
          icon: Icon(Icons.bookmark_border_rounded, size: 14, color: Colors.white.withValues(alpha: 0.95)),
          count: post.bookmarkCount,
        ),
      ],
    );
  }
}

class _HeroStat extends StatelessWidget {
  const _HeroStat({required this.icon, required this.count});

  final Widget icon;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        icon,
        const SizedBox(width: 3),
        Text(
          count > 99 ? '99+' : '$count',
          style: GoogleFonts.jetBrainsMono(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            color: Colors.white.withValues(alpha: 0.95),
          ),
        ),
      ],
    );
  }
}

class _TrendingHeroMessage extends StatelessWidget {
  const _TrendingHeroMessage({
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
    return Container(
      height: TrendingStackedHero.stageHeight,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: colors.card,
        border: Border.all(color: colors.border, width: 2),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 32, color: colors.mutedForeground),
          const SizedBox(height: 10),
          Text(
            title,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: colors.foreground),
          ),
          const SizedBox(height: 6),
          Text(
            message,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 12, color: colors.mutedForeground),
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
