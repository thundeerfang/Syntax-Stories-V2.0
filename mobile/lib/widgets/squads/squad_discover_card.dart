import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/squad_summary.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/resolve_profile_media_url.dart';
import '../../utils/squad_category.dart';

String formatSquadMemberCount(int n) {
  if (n >= 1000000) {
    final v = n / 1000000;
    final rounded = v >= 10 ? v.round().toString() : v.toStringAsFixed(1).replaceAll(RegExp(r'\.0$'), '');
    return '${rounded}M';
  }
  if (n >= 1000) {
    final v = n / 1000;
    final rounded = v >= 10 ? v.round().toString() : v.toStringAsFixed(1).replaceAll(RegExp(r'\.0$'), '');
    return '${rounded}K';
  }
  return '$n';
}

enum SquadDiscoverCardLayout { standard, vertical }

/// Standard discover card layout metrics.
const kSquadDiscoverBannerHeight = 88.0;
const kSquadDiscoverIconOverlap = 18.0;
const kSquadDiscoverIconSize = 44.0;
const kSquadDiscoverBodyFadeStart = 66.0;
const kSquadDiscoverBodyFadeHeight = 22.0;
const kSquadDiscoverBodyHeight = 84.0;

/// Reusable squad discover card — mirrors webapp `SquadDiscoverCard`.
class SquadDiscoverCard extends StatelessWidget {
  const SquadDiscoverCard({
    super.key,
    required this.squad,
    required this.onJoin,
    required this.onOpen,
    this.joinBusy = false,
    this.layout = SquadDiscoverCardLayout.standard,
    this.verticalCompact = false,
  });

  final SquadSummary squad;
  final VoidCallback onJoin;
  final VoidCallback onOpen;
  final bool joinBusy;
  final SquadDiscoverCardLayout layout;
  final bool verticalCompact;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final banner = resolveProfileMediaUrl(squad.coverBannerUrl);
    final icon = resolveProfileMediaUrl(squad.iconUrl);
    final joined = squad.isMember;
    final showOpen = joined || squad.isPrivate;
    final categoryLabel =
        squad.isPublic && squad.category != null ? squadCategoryLabel(squad.category) : null;
    final action = showOpen
        ? _CornerActionButton(
            colors: colors,
            primary: true,
            icon: Icons.north_east_rounded,
            onTap: onOpen,
            size: verticalCompact ? 30 : 36,
          )
        : _CornerActionButton(
            colors: colors,
            primary: false,
            icon: Icons.person_add_rounded,
            busy: joinBusy,
            onTap: joinBusy ? null : onJoin,
            size: verticalCompact ? 30 : 36,
          );

    if (layout == SquadDiscoverCardLayout.vertical) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onOpen,
          splashColor: colors.primary.withValues(alpha: 0.14),
          highlightColor: colors.primary.withValues(alpha: 0.07),
          child: _VerticalPosterCard(
            squad: squad,
            bannerUrl: banner,
            iconUrl: icon,
            colors: colors,
            categoryLabel: categoryLabel,
            action: action,
            compact: verticalCompact,
          ),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: colors.border, width: 3),
        boxShadow: [
          BoxShadow(
            color: colors.shadow.withValues(alpha: 0.12),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: colors.background,
        child: InkWell(
          onTap: onOpen,
          splashColor: colors.primary.withValues(alpha: 0.14),
          highlightColor: colors.primary.withValues(alpha: 0.07),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SizedBox(
                    height: kSquadDiscoverBannerHeight,
                    child: _Banner(bannerUrl: banner, colors: colors),
                  ),
                  ColoredBox(
                    color: colors.background,
                    child: const SizedBox(height: kSquadDiscoverBodyHeight),
                  ),
                ],
              ),
              Positioned(
                left: 0,
                right: 0,
                top: kSquadDiscoverBodyFadeStart,
                height: kSquadDiscoverBodyFadeHeight,
                child: IgnorePointer(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          colors.background.withValues(alpha: 0),
                          colors.background.withValues(alpha: 0.45),
                          colors.background,
                        ],
                        stops: const [0.0, 0.72, 1.0],
                      ),
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                top: kSquadDiscoverBannerHeight - kSquadDiscoverIconOverlap,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          _SquadIcon(
                            iconUrl: icon,
                            name: squad.name,
                            colors: colors,
                            size: kSquadDiscoverIconSize,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.only(bottom: 1),
                              child: _MemberPreviewRow(
                                previews: squad.memberPreview,
                                memberCount: squad.memberCount,
                                colors: colors,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        squad.name.toUpperCase(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        softWrap: false,
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.3,
                          height: 1.1,
                          color: colors.foreground,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              '@${squad.displayHandle}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              softWrap: false,
                              style: GoogleFonts.jetBrainsMono(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: colors.mutedForeground,
                              ),
                            ),
                          ),
                          if (categoryLabel != null) ...[
                            const SizedBox(width: 8),
                            _MetaBadge(label: categoryLabel, colors: colors),
                          ] else if (squad.isPrivate) ...[
                            const SizedBox(width: 8),
                            _MetaBadge(
                              label: 'Private',
                              colors: colors,
                              icon: Icons.lock_rounded,
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              Positioned(top: 8, right: 8, child: action),
            ],
          ),
        ),
      ),
    );
  }
}

class _VerticalPosterCard extends StatelessWidget {
  const _VerticalPosterCard({
    required this.squad,
    required this.bannerUrl,
    required this.iconUrl,
    required this.colors,
    required this.categoryLabel,
    required this.action,
    this.compact = false,
  });

  final SquadSummary squad;
  final String bannerUrl;
  final String iconUrl;
  final AppColorTokens colors;
  final String? categoryLabel;
  final Widget action;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final height = compact ? 196.0 : 280.0;
    final pad = compact ? 10.0 : 14.0;
    final iconSize = compact ? 40.0 : 56.0;
    final titleSize = compact ? 14.0 : 18.0;
    final handleSize = compact ? 10.0 : 12.0;

    return Container(
      height: height,
      decoration: BoxDecoration(
        border: Border.all(color: colors.border, width: compact ? 2 : 3),
        boxShadow: [
          BoxShadow(
            color: colors.shadow.withValues(alpha: 0.12),
            blurRadius: compact ? 6 : 8,
            offset: Offset(0, compact ? 3 : 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.expand,
        children: [
          _FullBleedBanner(bannerUrl: bannerUrl, colors: colors),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  colors.background.withValues(alpha: 0.08),
                  colors.background.withValues(alpha: 0.42),
                  colors.background.withValues(alpha: 0.96),
                ],
                stops: const [0.0, 0.45, 1.0],
              ),
            ),
          ),
          Positioned(top: compact ? 6 : 8, right: compact ? 6 : 8, child: action),
          Positioned(
            left: pad,
            right: pad,
            bottom: pad,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    _SquadIcon(
                      iconUrl: iconUrl,
                      name: squad.name,
                      colors: colors,
                      size: iconSize,
                    ),
                    SizedBox(width: compact ? 8 : 12),
                    Expanded(
                      child: _MemberPreviewRow(
                        previews: squad.memberPreview,
                        memberCount: squad.memberCount,
                        colors: colors,
                        compact: compact,
                      ),
                    ),
                  ],
                ),
                SizedBox(height: compact ? 8 : 12),
                Text(
                  squad.name.toUpperCase(),
                  maxLines: compact ? 1 : 2,
                  overflow: TextOverflow.ellipsis,
                  softWrap: false,
                  style: GoogleFonts.inter(
                    fontSize: titleSize,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.3,
                    color: colors.foreground,
                  ),
                ),
                SizedBox(height: compact ? 2 : 4),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        '@${squad.displayHandle}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        softWrap: false,
                        style: GoogleFonts.jetBrainsMono(
                          fontSize: handleSize,
                          fontWeight: FontWeight.w600,
                          color: colors.mutedForeground,
                        ),
                      ),
                    ),
                    if (categoryLabel != null) ...[
                      const SizedBox(width: 8),
                      _MetaBadge(label: categoryLabel!, colors: colors),
                    ] else if (squad.isPrivate) ...[
                      const SizedBox(width: 8),
                      _MetaBadge(
                        label: 'Private',
                        colors: colors,
                        icon: Icons.lock_rounded,
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FullBleedBanner extends StatelessWidget {
  const _FullBleedBanner({required this.bannerUrl, required this.colors});

  final String bannerUrl;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    if (bannerUrl.isNotEmpty) {
      return Image.network(
        bannerUrl,
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
        errorBuilder: (_, _, _) => _BannerFallback(colors: colors),
      );
    }
    return _BannerFallback(colors: colors);
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.bannerUrl, required this.colors});

  final String bannerUrl;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Stack(
      fit: StackFit.expand,
      children: [
        if (bannerUrl.isNotEmpty)
          Image.network(
            bannerUrl,
            fit: BoxFit.cover,
            errorBuilder: (_, _, _) => _BannerFallback(colors: colors),
          )
        else
          _BannerFallback(colors: colors),
        DecoratedBox(
          decoration: BoxDecoration(
            color: colors.background.withValues(alpha: 0.14),
          ),
        ),
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: const Alignment(1.0, -0.35),
              radius: 0.75,
              colors: [
                primary.withValues(alpha: 0.28),
                Colors.transparent,
              ],
            ),
          ),
        ),
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.bottomCenter,
              end: Alignment.topCenter,
              colors: [
                colors.background.withValues(alpha: 0.88),
                colors.background.withValues(alpha: 0.16),
                Colors.transparent,
              ],
              stops: const [0.0, 0.16, 0.42],
            ),
          ),
        ),
      ],
    );
  }
}

class _BannerFallback extends StatelessWidget {
  const _BannerFallback({required this.colors});

  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            colors.primary.withValues(alpha: 0.35),
            colors.primary.withValues(alpha: 0.12),
          ],
        ),
      ),
    );
  }
}

class _SquadIcon extends StatelessWidget {
  const _SquadIcon({
    required this.iconUrl,
    required this.name,
    required this.colors,
    this.size = kSquadDiscoverIconSize,
  });

  final String iconUrl;
  final String name;
  final AppColorTokens colors;
  final double size;

  @override
  Widget build(BuildContext context) {
    final letter = name.isNotEmpty ? name[0].toUpperCase() : '?';
    final borderW = size <= 44 ? 2.0 : 3.0;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: colors.card,
        border: Border.all(color: colors.border, width: borderW),
      ),
      child: iconUrl.isNotEmpty
          ? Image.network(
              iconUrl,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => _LetterFallback(letter: letter, size: size),
            )
          : _LetterFallback(letter: letter, size: size),
    );
  }
}

class _LetterFallback extends StatelessWidget {
  const _LetterFallback({required this.letter, this.size = 56});

  final String letter;
  final double size;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: const Color(0xFFFCD34D),
      child: Center(
        child: Text(
          letter,
          style: GoogleFonts.inter(
            fontSize: size * 0.43,
            fontWeight: FontWeight.w900,
            color: const Color(0xFF042F2E),
          ),
        ),
      ),
    );
  }
}

class _MemberPreviewRow extends StatelessWidget {
  const _MemberPreviewRow({
    required this.previews,
    required this.memberCount,
    required this.colors,
    this.compact = false,
  });

  final List<SquadMemberPreview> previews;
  final int memberCount;
  final AppColorTokens colors;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final shown = previews.take(3).toList();
    final avatarSize = compact ? 20.0 : 22.0;
    final avatarStep = compact ? 14.0 : 16.0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: avatarSize,
          child: Stack(
            children: [
              for (var i = 0; i < shown.length; i++)
                Positioned(
                  left: i * avatarStep,
                  child: _MemberAvatar(
                    url: resolveProfileMediaUrl(shown[i].profileImg),
                    username: shown[i].username,
                    size: avatarSize,
                  ),
                ),
            ],
          ),
        ),
        SizedBox(height: compact ? 2 : 3),
        Text(
          '${formatSquadMemberCount(memberCount)} members'.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: compact ? 8 : 9,
            fontWeight: FontWeight.w700,
            letterSpacing: compact ? 0.9 : 1.1,
            color: colors.primary,
          ),
        ),
      ],
    );
  }
}

class _MemberAvatar extends StatelessWidget {
  const _MemberAvatar({required this.url, required this.username, this.size = 28});

  final String url;
  final String username;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.9),
          width: size <= 24 ? 1.5 : 2,
        ),
      ),
      child: url.isNotEmpty
          ? Image.network(url, fit: BoxFit.cover, errorBuilder: (_, _, _) => _AvatarFallback(username: username))
          : _AvatarFallback(username: username),
    );
  }
}

class _AvatarFallback extends StatelessWidget {
  const _AvatarFallback({required this.username});

  final String username;

  @override
  Widget build(BuildContext context) {
    final letter = username.isNotEmpty ? username[0].toUpperCase() : '?';
    return ColoredBox(
      color: const Color(0xFFE2E8F0),
      child: Center(
        child: Text(
          letter,
          style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800),
        ),
      ),
    );
  }
}

class _MetaBadge extends StatelessWidget {
  const _MetaBadge({required this.label, required this.colors, this.icon});

  final String label;
  final AppColorTokens colors;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: colors.muted.withValues(alpha: 0.5),
        border: Border.all(color: colors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: colors.foreground),
            const SizedBox(width: 3),
          ],
          Text(
            label.toUpperCase(),
            style: GoogleFonts.jetBrainsMono(
              fontSize: 9,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.2,
              color: colors.foreground,
            ),
          ),
        ],
      ),
    );
  }
}

class _CornerActionButton extends StatelessWidget {
  const _CornerActionButton({
    required this.colors,
    required this.primary,
    required this.icon,
    required this.onTap,
    this.busy = false,
    this.size = 36,
  });

  final AppColorTokens colors;
  final bool primary;
  final IconData icon;
  final VoidCallback? onTap;
  final bool busy;
  final double size;

  @override
  Widget build(BuildContext context) {
    final iconSize = size * 0.56;
    return Material(
      color: primary ? colors.primary : colors.card,
      child: InkWell(
        onTap: onTap,
        child: SizedBox(
          width: size,
          height: size,
          child: busy
              ? Padding(
                  padding: EdgeInsets.all(size * 0.22),
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: primary ? colors.primaryForeground : colors.primary,
                  ),
                )
              : Icon(
                  icon,
                  size: iconSize,
                  color: primary ? colors.primaryForeground : colors.primary,
                ),
        ),
      ),
    );
  }
}
