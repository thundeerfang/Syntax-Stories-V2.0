import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import '../ui/app_tappable.dart';
import '../profile/profile_respect_lottie.dart';
import 'blog_bookmark_lottie.dart';

/// Fixed bottom engagement toolbar — mirrors webapp `BlogPostCommentsDock`.
class BlogEngagementDock extends StatelessWidget {
  const BlogEngagementDock({
    super.key,
    required this.respectCount,
    required this.repostCount,
    required this.bookmarkCount,
    required this.commentCount,
    required this.viewerHasRespected,
    required this.viewerHasReposted,
    required this.viewerHasBookmarked,
    required this.onRespect,
    required this.onRepost,
    required this.onBookmark,
    required this.onComment,
    this.respectBusy = false,
    this.repostBusy = false,
    this.bookmarkBusy = false,
    this.commentsHighlighted = false,
  });

  final int respectCount;
  final int repostCount;
  final int bookmarkCount;
  final int commentCount;
  final bool viewerHasRespected;
  final bool viewerHasReposted;
  final bool viewerHasBookmarked;
  final VoidCallback onRespect;
  final VoidCallback onRepost;
  final VoidCallback onBookmark;
  final VoidCallback onComment;
  final bool respectBusy;
  final bool repostBusy;
  final bool bookmarkBusy;
  final bool commentsHighlighted;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
        child: Center(
          child: Material(
            color: colors.card.withValues(alpha: 0.94),
            elevation: 8,
            shadowColor: colors.shadow.withValues(alpha: 0.2),
            child: Container(
              decoration: BoxDecoration(
                border: Border.all(color: colors.border.withValues(alpha: 0.7), width: 2),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _RespectDockAction(
                    count: respectCount,
                    active: viewerHasRespected,
                    busy: respectBusy,
                    onTap: onRespect,
                    colors: colors,
                    primary: primary,
                  ),
                  const SizedBox(width: 4),
                  _DockAction(
                    label: 'Repost',
                    icon: Icons.repeat_rounded,
                    count: repostCount,
                    active: viewerHasReposted,
                    showActiveDot: viewerHasReposted,
                    showCountBubble: true,
                    disabled: repostBusy,
                    onTap: onRepost,
                    colors: colors,
                    primary: primary,
                  ),
                  const SizedBox(width: 4),
                  _BookmarkDockAction(
                    count: bookmarkCount,
                    active: viewerHasBookmarked,
                    busy: bookmarkBusy,
                    onTap: onBookmark,
                    colors: colors,
                    primary: primary,
                  ),
                  const SizedBox(width: 4),
                  _DockAction(
                    label: 'Comment',
                    icon: Icons.chat_bubble_outline_rounded,
                    count: commentCount,
                    active: commentsHighlighted,
                    highlighted: commentsHighlighted,
                    showCountBubble: true,
                    onTap: onComment,
                    colors: colors,
                    primary: primary,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _RespectDockAction extends StatelessWidget {
  const _RespectDockAction({
    required this.count,
    required this.active,
    required this.busy,
    required this.onTap,
    required this.colors,
    required this.primary,
  });

  final int count;
  final bool active;
  final bool busy;
  final VoidCallback onTap;
  final AppColorTokens colors;
  final Color primary;

  @override
  Widget build(BuildContext context) {
    return _DockAction(
      label: 'Respect',
      count: count,
      active: active,
      showActiveDot: active,
      showCountBubble: true,
      disabled: busy,
      onTap: onTap,
      colors: colors,
      primary: primary,
      iconBuilder: (_) {
        if (busy) {
          return ProfileRespectLottie(size: 18);
        }
        return SvgPicture.asset(
          'assets/icons/lightning-bolt.svg',
          width: 18,
          height: 18,
        );
      },
    );
  }
}

class _BookmarkDockAction extends StatelessWidget {
  const _BookmarkDockAction({
    required this.count,
    required this.active,
    required this.busy,
    required this.onTap,
    required this.colors,
    required this.primary,
  });

  final int count;
  final bool active;
  final bool busy;
  final VoidCallback onTap;
  final AppColorTokens colors;
  final Color primary;

  @override
  Widget build(BuildContext context) {
    return _DockAction(
      label: 'Bookmark',
      count: count,
      active: active,
      showActiveDot: active,
      showCountBubble: true,
      disabled: busy,
      onTap: onTap,
      colors: colors,
      primary: primary,
      iconBuilder: (iconColor) {
        if (busy) {
          return BlogBookmarkLottie(size: 18, play: true);
        }
        return Icon(
          active ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
          size: 18,
          color: iconColor,
        );
      },
    );
  }
}

typedef _DockIconBuilder = Widget Function(Color iconColor);

class _DockAction extends StatelessWidget {
  const _DockAction({
    required this.label,
    required this.count,
    required this.active,
    required this.onTap,
    required this.colors,
    required this.primary,
    this.icon,
    this.iconBuilder,
    this.showActiveDot = false,
    this.showCountBubble = false,
    this.highlighted = false,
    this.disabled = false,
  });

  final String label;
  final IconData? icon;
  final _DockIconBuilder? iconBuilder;
  final int count;
  final bool active;
  final bool showActiveDot;
  final bool showCountBubble;
  final bool highlighted;
  final bool disabled;
  final VoidCallback onTap;
  final AppColorTokens colors;
  final Color primary;

  @override
  Widget build(BuildContext context) {
    final iconColor = disabled
        ? colors.mutedForeground.withValues(alpha: 0.45)
        : (active || highlighted ? primary : colors.mutedForeground);

    final fill = highlighted
        ? primary
        : (active ? primary.withValues(alpha: 0.12) : colors.background);
    final borderColor = highlighted
        ? primary
        : (active ? primary : colors.border);

    return Semantics(
      button: true,
      enabled: !disabled,
      label: label,
      child: Opacity(
        opacity: disabled ? 0.55 : 1,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: disabled ? null : onTap,
            splashColor: highlighted ? appRippleOnPrimary(colors) : appRippleOnSurface(colors),
            highlightColor: (highlighted ? appRippleOnPrimary(colors) : appRippleOnSurface(colors))
                .withValues(alpha: 0.08),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 3),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Ink(
                        decoration: BoxDecoration(
                          border: Border.all(color: borderColor, width: 1.5),
                          color: fill,
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 5),
                          child: iconBuilder != null
                              ? iconBuilder!(highlighted ? colors.primaryForeground : iconColor)
                              : Icon(
                                  icon,
                                  size: 18,
                                  color: highlighted ? colors.primaryForeground : iconColor,
                                ),
                        ),
                      ),
                      if (showActiveDot)
                        Positioned(
                          right: -3,
                          top: -3,
                          child: Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: primary,
                              border: Border.all(color: colors.card, width: 1.5),
                            ),
                          ),
                        ),
                      if (showCountBubble)
                        Positioned(
                          right: -8,
                          top: -8,
                          child: _DockCountBubble(
                            count: count,
                            colors: colors,
                            primary: primary,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    label.toUpperCase(),
                    style: GoogleFonts.inter(
                      fontSize: 7,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                      color: highlighted
                          ? primary
                          : (active ? primary : colors.mutedForeground),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DockCountBubble extends StatelessWidget {
  const _DockCountBubble({
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
      constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
      padding: const EdgeInsets.symmetric(horizontal: 3),
      decoration: BoxDecoration(
        color: primary,
        border: Border.all(color: colors.border, width: 1.5),
      ),
      alignment: Alignment.center,
      child: Text(
        text,
        style: GoogleFonts.jetBrainsMono(
          fontSize: 7,
          fontWeight: FontWeight.w800,
          height: 1,
          color: colors.primaryForeground,
        ),
      ),
    );
  }
}
