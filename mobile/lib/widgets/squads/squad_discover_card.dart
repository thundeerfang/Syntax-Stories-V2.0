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

/// Reusable squad discover card — mirrors webapp `SquadDiscoverCard`.
class SquadDiscoverCard extends StatelessWidget {
  const SquadDiscoverCard({
    super.key,
    required this.squad,
    required this.onJoin,
    required this.onOpen,
    this.joinBusy = false,
  });

  final SquadSummary squad;
  final VoidCallback onJoin;
  final VoidCallback onOpen;
  final bool joinBusy;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final banner = resolveProfileMediaUrl(squad.coverBannerUrl);
    final icon = resolveProfileMediaUrl(squad.iconUrl);
    final joined = squad.isMember;
    final showOpen = joined || squad.isPrivate;
    final categoryLabel =
        squad.isPublic && squad.category != null ? squadCategoryLabel(squad.category) : null;

    return Container(
      decoration: BoxDecoration(
        color: colors.background,
        border: Border.all(color: colors.border, width: 3),
        boxShadow: [
          BoxShadow(
            color: colors.shadow.withValues(alpha: 0.12),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(
                height: 112,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Positioned.fill(child: _Banner(bannerUrl: banner, colors: colors)),
                    Positioned(
                      left: 16,
                      bottom: -28,
                      child: _SquadIcon(iconUrl: icon, name: squad.name, colors: colors),
                    ),
                    Positioned(
                      left: 86,
                      right: 52,
                      bottom: 4,
                      child: _MemberPreviewRow(
                        previews: squad.memberPreview,
                        memberCount: squad.memberCount,
                        colors: colors,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 40),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      squad.name.toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.3,
                        color: colors.foreground,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '@${squad.displayHandle}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.jetBrainsMono(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: colors.mutedForeground,
                            ),
                          ),
                        ),
                        if (categoryLabel != null)
                          _MetaBadge(label: categoryLabel, colors: colors)
                        else if (squad.isPrivate)
                          _MetaBadge(
                            label: 'Private',
                            colors: colors,
                            icon: Icons.lock_rounded,
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          Positioned(
            top: 8,
            right: 8,
            child: showOpen ? _CornerActionButton(
              colors: colors,
              primary: true,
              icon: Icons.north_east_rounded,
              onTap: onOpen,
            ) : _CornerActionButton(
              colors: colors,
              primary: false,
              icon: Icons.person_add_rounded,
              busy: joinBusy,
              onTap: joinBusy ? null : onJoin,
            ),
          ),
        ],
      ),
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.bannerUrl, required this.colors});

  final String bannerUrl;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
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
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                colors.background.withValues(alpha: 0.05),
                colors.background.withValues(alpha: 0.9),
              ],
              stops: const [0.45, 1],
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
  const _SquadIcon({required this.iconUrl, required this.name, required this.colors});

  final String iconUrl;
  final String name;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final letter = name.isNotEmpty ? name[0].toUpperCase() : '?';
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        color: colors.card,
        border: Border.all(color: colors.border, width: 3),
      ),
      child: iconUrl.isNotEmpty
          ? Image.network(
              iconUrl,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => _LetterFallback(letter: letter),
            )
          : _LetterFallback(letter: letter),
    );
  }
}

class _LetterFallback extends StatelessWidget {
  const _LetterFallback({required this.letter});

  final String letter;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: const Color(0xFFFCD34D),
      child: Center(
        child: Text(
          letter,
          style: GoogleFonts.inter(
            fontSize: 24,
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
  });

  final List<SquadMemberPreview> previews;
  final int memberCount;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final shown = previews.take(3).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 28,
          child: Stack(
            children: [
              for (var i = 0; i < shown.length; i++)
                Positioned(
                  left: i * 20.0,
                  child: _MemberAvatar(
                    url: resolveProfileMediaUrl(shown[i].profileImg),
                    username: shown[i].username,
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 6),
        Text(
          '${formatSquadMemberCount(memberCount)} members'.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.1,
            color: colors.primary,
          ),
        ),
      ],
    );
  }
}

class _MemberAvatar extends StatelessWidget {
  const _MemberAvatar({required this.url, required this.username});

  final String url;
  final String username;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        border: Border.all(color: Colors.white.withValues(alpha: 0.9), width: 2),
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
  });

  final AppColorTokens colors;
  final bool primary;
  final IconData icon;
  final VoidCallback? onTap;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: primary ? colors.primary : colors.card,
      child: InkWell(
        onTap: onTap,
        child: SizedBox(
          width: 36,
          height: 36,
          child: busy
              ? Padding(
                  padding: const EdgeInsets.all(8),
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: primary ? colors.primaryForeground : colors.primary,
                  ),
                )
              : Icon(
                  icon,
                  size: 20,
                  color: primary ? colors.primaryForeground : colors.primary,
                ),
        ),
      ),
    );
  }
}
