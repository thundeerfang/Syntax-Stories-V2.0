import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/home_config.dart';
import '../../models/blog_feed_post.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/blog_card_format.dart';
import '../../utils/resolve_profile_media_url.dart';
import 'home_hero_skeleton.dart';

/// Single-window home hero — mirrors webapp `HomePageContent` hero section.
class HomeHeroSwiper extends StatefulWidget {
  const HomeHeroSwiper({
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

  static const heroHeight = 420.0;

  @override
  State<HomeHeroSwiper> createState() => _HomeHeroSwiperState();
}

class _HomeHeroSwiperState extends State<HomeHeroSwiper> {
  static const _animDuration = Duration(milliseconds: 320);
  static const _manualCooldown = Duration(milliseconds: kHomeHeroAutoplayMs + 400);
  static const _loopPages = 2000;

  PageController? _pageController;
  int _index = 0;
  bool _pointerDown = false;
  Timer? _autoplay;

  int get _postCount => widget.posts.length;

  int get _virtualCount => _postCount > 1 ? _postCount * _loopPages : _postCount;

  int get _loopAnchor => _postCount > 1 ? _postCount * (_loopPages ~/ 2) : 0;

  @override
  void initState() {
    super.initState();
    _resetPageController();
    _scheduleAutoplay();
  }

  void _resetPageController() {
    _pageController?.dispose();
    _pageController = PageController(initialPage: _loopAnchor);
    _index = 0;
  }

  @override
  void didUpdateWidget(covariant HomeHeroSwiper oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.posts.length != widget.posts.length) {
      _resetPageController();
    }
    if (widget.posts.length > 1) {
      _scheduleAutoplay();
    } else {
      _autoplay?.cancel();
    }
  }

  @override
  void reassemble() {
    super.reassemble();
    _autoplay?.cancel();
    if (widget.posts.length > 1) {
      _scheduleAutoplay();
    }
  }

  @override
  void dispose() {
    _autoplay?.cancel();
    _pageController?.dispose();
    super.dispose();
  }

  bool get _autoplayBlocked => _pointerDown;

  void _scheduleAutoplay({Duration? delay}) {
    _autoplay?.cancel();
    if (widget.posts.length <= 1) return;

    _autoplay = Timer(delay ?? const Duration(milliseconds: kHomeHeroAutoplayMs), () {
      if (!mounted || _autoplayBlocked) {
        _scheduleAutoplay(delay: const Duration(milliseconds: 400));
        return;
      }
      _advance(1, manual: false);
    });
  }

  void _onManualInteraction() {
    _autoplay?.cancel();
    _scheduleAutoplay(delay: _manualCooldown);
  }

  void _advance(int dir, {required bool manual}) {
    final n = widget.posts.length;
    final controller = _pageController;
    if (n <= 1 || controller == null || !controller.hasClients) return;

    final current = controller.page?.round() ?? _loopAnchor;
    final next = current + dir;

    _autoplay?.cancel();
    controller.animateToPage(
      next,
      duration: _animDuration,
      curve: Curves.easeInOutCubic,
    );
    if (manual) _onManualInteraction();
  }

  void _goTo(int targetIndex) {
    final n = widget.posts.length;
    final controller = _pageController;
    if (n <= 1 || targetIndex == _index || controller == null || !controller.hasClients) {
      return;
    }

    final current = controller.page?.round() ?? _loopAnchor;
    final base = current - (current % n);
    final candidates = [base + targetIndex, base + targetIndex + n, base + targetIndex - n];
    final destination = candidates.reduce(
      (a, b) => (a - current).abs() <= (b - current).abs() ? a : b,
    );

    _autoplay?.cancel();
    controller.animateToPage(
      destination,
      duration: _animDuration,
      curve: Curves.easeInOutCubic,
    );
    _onManualInteraction();
  }

  void _onPageChanged(int page) {
    final n = widget.posts.length;
    if (n == 0) return;
    setState(() => _index = page % n);
    if (!_pointerDown) {
      _scheduleAutoplay();
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        kHomePageHorizontalPadding,
        8,
        kHomePageHorizontalPadding,
        8,
      ),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colors.card,
          border: Border.all(color: colors.border, width: 2),
        ),
        child: ClipRect(
          child: SizedBox(
            height: HomeHeroSwiper.heroHeight,
            child: _buildInner(colors),
          ),
        ),
      ),
    );
  }

  Widget _buildInner(AppColorTokens colors) {
    if (widget.loading) {
      return const HomeHeroSkeleton();
    }

    if (widget.error != null) {
      return _HomeHeroMessage(
        colors: colors,
        icon: Icons.error_outline_rounded,
        title: 'Could not load featured stories',
        message: widget.error!,
        actionLabel: 'Try again',
        onAction: widget.onRetry,
      );
    }

    if (widget.posts.isEmpty) {
      return _HomeHeroMessage(
        colors: colors,
        icon: Icons.newspaper_outlined,
        title: 'No featured stories yet',
        message: 'Top stories from the community show up here once writers publish.',
        actionLabel: widget.onBrowseTopics != null ? 'Browse topics' : null,
        onAction: widget.onBrowseTopics,
      );
    }

    final n = widget.posts.length;

    return Listener(
      onPointerDown: (_) {
        _pointerDown = true;
        _autoplay?.cancel();
      },
      onPointerUp: (_) {
        _pointerDown = false;
        _scheduleAutoplay(delay: _manualCooldown);
      },
      onPointerCancel: (_) {
        _pointerDown = false;
        _scheduleAutoplay(delay: _manualCooldown);
      },
      child: Stack(
        fit: StackFit.expand,
        children: [
          PageView.builder(
            controller: _pageController,
            itemCount: _virtualCount,
            onPageChanged: _onPageChanged,
            physics: n > 1 ? const BouncingScrollPhysics() : const NeverScrollableScrollPhysics(),
            itemBuilder: (context, i) {
              final post = widget.posts[i % n];
              return _HomeHeroSlide(
                post: post,
                onTap: () => widget.onOpenPost(post),
              );
            },
          ),
          if (n > 1)
            Positioned(
              left: 16,
              top: 16,
              child: _HeroPaginationBox(
                count: n,
                activeIndex: _index,
                onSelect: _goTo,
              ),
            ),
        ],
      ),
    );
  }
}

class _HeroPaginationBox extends StatelessWidget {
  const _HeroPaginationBox({
    required this.count,
    required this.activeIndex,
    required this.onSelect,
  });

  final int count;
  final int activeIndex;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;

    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.45),
            border: Border.all(color: Colors.white.withValues(alpha: 0.22), width: 2),
          ),
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (var i = 0; i < count; i++)
                  GestureDetector(
                    onTap: () => onSelect(i),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: i == activeIndex
                            ? primary
                            : Colors.white.withValues(alpha: 0.12),
                        border: Border.all(
                          color: i == activeIndex
                              ? primary
                              : Colors.white.withValues(alpha: 0.55),
                          width: 2,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _HomeHeroSlide extends StatelessWidget {
  const _HomeHeroSlide({
    required this.post,
    required this.onTap,
  });

  final BlogFeedPost post;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final coverUrl = resolveProfileMediaUrl(post.thumbnailUrl);
    final categoryLabel = (post.category?.trim().isNotEmpty == true
            ? post.category!.trim()
            : blogCategoryLabel(post))
        .toUpperCase();
    final title = post.title.toUpperCase();
    final excerpt = _heroExcerpt(post.summary, 280);
    final authorName = post.author.fullName.trim().isNotEmpty
        ? post.author.fullName.trim()
        : post.author.username.trim();
    final avatarUrl = resolveProfileMediaUrl(post.author.profileImg);
    final published = DateTime.tryParse(post.publishedAt);

    return Material(
      color: Colors.black,
      child: InkWell(
        onTap: onTap,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (coverUrl.isNotEmpty)
              Image.network(
                coverUrl,
                fit: BoxFit.cover,
                color: Colors.black.withValues(alpha: 0.4),
                colorBlendMode: BlendMode.darken,
                errorBuilder: (_, _, _) => _CoverFallback(primary: primary, colors: colors),
              )
            else
              _CoverFallback(primary: primary, colors: colors),
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withValues(alpha: 0.4),
                    Colors.black.withValues(alpha: 0.92),
                  ],
                  stops: const [0.35, 0.62, 1.0],
                ),
              ),
            ),
            if (published != null)
              Positioned(
                right: 16,
                top: 16,
                child: Transform.rotate(
                  angle: 0.12,
                  child: _EditionBadge(date: published),
                ),
              ),
            Positioned(
              left: 16,
              right: 16,
              bottom: 20,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: primary,
                      border: Border.all(color: primary, width: 2),
                    ),
                    child: Text(
                      categoryLabel,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.jetBrainsMono(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.4,
                        color: colors.primaryForeground,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    title,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      height: 1.05,
                      letterSpacing: -0.6,
                      color: Colors.white,
                    ),
                  ),
                  if (excerpt.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      'SUMMARY',
                      style: GoogleFonts.jetBrainsMono(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 2,
                        color: Colors.white.withValues(alpha: 0.45),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      excerpt,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.jetBrainsMono(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        height: 1.45,
                        color: Colors.white.withValues(alpha: 0.78),
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.only(top: 14),
                    decoration: BoxDecoration(
                      border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.15))),
                    ),
                    child: Row(
                      children: [
                        _HeroAvatar(url: avatarUrl, label: authorName),
                        const SizedBox(width: 10),
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
                                  '@${post.author.username.trim()}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.jetBrainsMono(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white.withValues(alpha: 0.5),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        _HeroStatsRow(post: post),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _heroExcerpt(String raw, int maxLen) {
  final text = raw.replaceAll(RegExp(r'\s+'), ' ').trim();
  if (text.length <= maxLen) return text;
  return '${text.substring(0, maxLen).trimRight()}…';
}

String _monthLabel(int month) {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return months[(month - 1).clamp(0, 11)];
}

class _EditionBadge extends StatelessWidget {
  const _EditionBadge({required this.date});

  final DateTime date;

  @override
  Widget build(BuildContext context) {
    final month = _monthLabel(date.month);
    final year = date.year;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Positioned(
          left: -4,
          top: -4,
          child: Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.black, width: 1),
              color: const Color(0xFFD4D4D8),
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: const Color(0xFFFACC15),
            border: Border.all(color: Colors.black, width: 2),
          ),
          child: Column(
            children: [
              Text(
                'EDITION',
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                  color: Colors.black.withValues(alpha: 0.6),
                ),
              ),
              Text(
                '$month $year',
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  color: Colors.black,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CoverFallback extends StatelessWidget {
  const _CoverFallback({required this.primary, required this.colors});

  final Color primary;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            primary.withValues(alpha: 0.25),
            colors.muted.withValues(alpha: 0.45),
          ],
        ),
      ),
      child: Center(
        child: Icon(Icons.article_outlined, size: 48, color: primary.withValues(alpha: 0.5)),
      ),
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
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 2),
        color: const Color(0xFF27272A),
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
        style: GoogleFonts.jetBrainsMono(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white),
      ),
    );
  }
}

class _HeroStatsRow extends StatelessWidget {
  const _HeroStatsRow({required this.post});

  final BlogFeedPost post;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;

    return Wrap(
      spacing: 4,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        _HeroStat(
          icon: SvgPicture.asset('assets/icons/lightning-bolt.svg', width: 14, height: 14),
          count: post.respectCount,
        ),
        Text('·', style: TextStyle(color: Colors.white.withValues(alpha: 0.35))),
        _HeroStat(
          icon: Icon(Icons.repeat_rounded, size: 14, color: primary),
          count: post.repostCount,
        ),
        Text('·', style: TextStyle(color: Colors.white.withValues(alpha: 0.35))),
        _HeroStat(
          icon: Icon(Icons.bookmark_border_rounded, size: 14, color: primary),
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

  String get _label {
    if (count > 99) return '99+';
    return '${count.clamp(0, 999)}';
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        icon,
        const SizedBox(width: 4),
        Text(
          _label,
          style: GoogleFonts.jetBrainsMono(
            fontSize: 10,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
      ],
    );
  }
}

class _HomeHeroMessage extends StatelessWidget {
  const _HomeHeroMessage({
    required this.colors,
    required this.icon,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final AppColorTokens colors;
  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 36, color: colors.mutedForeground),
          const SizedBox(height: 12),
          Text(
            title,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w900,
              color: colors.foreground,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 13, color: colors.mutedForeground),
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
