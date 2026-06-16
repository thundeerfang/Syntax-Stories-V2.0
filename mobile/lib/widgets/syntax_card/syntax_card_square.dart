import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/syntax_card_data.dart';
import '../../utils/resolve_profile_media_url.dart';

/// Web Syntax Card primary — `#5f4fe6`.
const kSyntaxCardPrimary = Color(0xFF5F4FE6);

/// Design canvas (scaled from web 1080×1350).
const kSyntaxCardDesignWidth = 360.0;
const kSyntaxCardDesignHeight = 450.0;

/// Square developer card preview — mirrors webapp `SyntaxCardSquare`.
class SyntaxCardSquare extends StatelessWidget {
  const SyntaxCardSquare({
    super.key,
    required this.data,
  });

  final SyntaxCardData data;

  @override
  Widget build(BuildContext context) {
    const inset = 16.0;
    const coverHeight = 140.0;
    const avatarSize = 84.0;

    final avatarUrl = resolveProfileMediaUrl(data.profileImg);
    final coverUrl = resolveProfileMediaUrl(data.coverBanner);
    final username = data.username.trim();

    return ColoredBox(
      color: Colors.white,
      child: SizedBox(
        width: kSyntaxCardDesignWidth,
        height: kSyntaxCardDesignHeight,
        child: Column(
          children: [
            _CoverSection(
              coverUrl: coverUrl,
              username: username,
              profileUrl: data.profileUrl,
              inset: inset,
              coverHeight: coverHeight,
              avatarSize: avatarSize,
              avatarUrl: avatarUrl,
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(inset, avatarSize / 2 + 8, inset, 0),
              child: _StatsRow(
                posts: data.postsDisplay,
                respects: '${data.respectsCount}',
                followers: '${data.followersCount}',
              ),
            ),
            Expanded(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: inset),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    Column(
                      children: [
                        Text(
                          data.fullName.toUpperCase(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            fontStyle: FontStyle.italic,
                            letterSpacing: -0.4,
                            color: Colors.black,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Wrap(
                          alignment: WrapAlignment.center,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 6,
                          children: [
                            Text(
                              '@$username'.toUpperCase(),
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.2,
                                color: const Color(0xFF71717A),
                              ),
                            ),
                            if (data.joinedLabel.isNotEmpty) ...[
                              Text(
                                '·',
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  color: const Color(0xFFD4D4D8),
                                ),
                              ),
                              Text(
                                data.joinedLabel.toUpperCase(),
                                style: GoogleFonts.inter(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 1.0,
                                  color: const Color(0xFFA1A1AA),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                    if (data.categoryNames.isNotEmpty)
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final name in data.categoryNames)
                            _CategoryChip(label: name),
                        ],
                      ),
                  ],
                ),
              ),
            ),
            Container(
              padding: EdgeInsets.fromLTRB(inset, 10, inset, 14),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: Color(0xFFE4E4E7), width: 2)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final squad in data.squads)
                          _SquadLogo(
                            slug: squad.slug,
                            iconUrl: squad.iconUrl,
                          ),
                      ],
                    ),
                  ),
                  Image.asset(
                    'assets/logo.png',
                    height: 22,
                    fit: BoxFit.contain,
                    errorBuilder: (_, _, _) => Text(
                      'SYNTAX',
                      style: GoogleFonts.inter(
                        fontSize: 8,
                        fontWeight: FontWeight.w900,
                        color: Colors.black,
                      ),
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

class _CoverSection extends StatelessWidget {
  const _CoverSection({
    required this.coverUrl,
    required this.username,
    required this.profileUrl,
    required this.inset,
    required this.coverHeight,
    required this.avatarSize,
    required this.avatarUrl,
  });

  final String? coverUrl;
  final String username;
  final String profileUrl;
  final double inset;
  final double coverHeight;
  final double avatarSize;
  final String? avatarUrl;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: coverHeight + avatarSize / 2,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: coverHeight,
            child: DecoratedBox(
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: Colors.black, width: 3)),
              ),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (coverUrl != null && coverUrl!.isNotEmpty)
                    Image.network(
                      coverUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => const _CoverGradient(),
                    )
                  else
                    const _CoverGradient(),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                        colors: [
                          Colors.black.withValues(alpha: 0.8),
                          Colors.black.withValues(alpha: 0.3),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                  if (profileUrl.isNotEmpty)
                    Positioned(
                      top: inset,
                      left: inset,
                      right: inset,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
                        decoration: BoxDecoration(
                          color: kSyntaxCardPrimary,
                          border: Border.all(color: Colors.black, width: 3),
                          boxShadow: const [
                            BoxShadow(color: Colors.black26, offset: Offset(2, 2), blurRadius: 0),
                          ],
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.public_rounded, size: 14, color: Colors.white),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                                decoration: BoxDecoration(
                                  border: Border.all(color: Colors.white54, width: 2),
                                  color: Colors.black.withValues(alpha: 0.15),
                                ),
                                child: Text(
                                  profileUrl,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.inter(
                                    fontSize: 7,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            top: coverHeight - avatarSize / 2,
            child: Center(
              child: Container(
                width: avatarSize,
                height: avatarSize,
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: Colors.black, width: 3),
                  boxShadow: const [
                    BoxShadow(color: Colors.black26, offset: Offset(2, 2), blurRadius: 0),
                  ],
                ),
                clipBehavior: Clip.hardEdge,
                child: avatarUrl != null && avatarUrl!.isNotEmpty
                    ? Image.network(
                        avatarUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => _AvatarFallback(username: username),
                      )
                    : _AvatarFallback(username: username),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CoverGradient extends StatelessWidget {
  const _CoverGradient();

  @override
  Widget build(BuildContext context) {
    return const DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [kSyntaxCardPrimary, Color(0xFF18181B)],
        ),
      ),
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
      color: const Color(0xFFFCD34D),
      child: Center(
        child: Text(
          letter,
          style: GoogleFonts.inter(
            fontSize: 28,
            fontWeight: FontWeight.w900,
            color: const Color(0xFF042F2E),
          ),
        ),
      ),
    );
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({
    required this.posts,
    required this.respects,
    required this.followers,
  });

  final String posts;
  final String respects;
  final String followers;

  @override
  Widget build(BuildContext context) {
    final items = [
      (posts, 'Posts', Icons.article_outlined),
      (respects, 'Respects', Icons.bolt_rounded),
      (followers, 'Followers', Icons.groups_outlined),
    ];

    return DecoratedBox(
      decoration: BoxDecoration(
        color: kSyntaxCardPrimary,
        border: Border.all(color: Colors.black, width: 2),
        boxShadow: const [
          BoxShadow(color: Colors.black26, offset: Offset(2, 2), blurRadius: 0),
        ],
      ),
      child: IntrinsicHeight(
        child: Row(
          children: [
            for (var i = 0; i < items.length; i++) ...[
              if (i > 0)
                const VerticalDivider(width: 2, thickness: 2, color: Colors.black),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Column(
                    children: [
                      Text(
                        items[i].$1,
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          fontStyle: FontStyle.italic,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(items[i].$3, size: 10, color: Colors.white.withValues(alpha: 0.9)),
                          const SizedBox(width: 4),
                          Text(
                            items[i].$2.toUpperCase(),
                            style: GoogleFonts.inter(
                              fontSize: 7,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.8,
                              color: Colors.white.withValues(alpha: 0.9),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final tag = '#${label.toLowerCase().replaceAll(RegExp(r'\s+'), '-')}';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0xFFF4F4F5),
        border: Border.all(color: Colors.black, width: 3),
      ),
      child: Text(
        tag,
        style: GoogleFonts.inter(
          fontSize: 9,
          fontWeight: FontWeight.w900,
          color: Colors.black,
        ),
      ),
    );
  }
}

class _SquadLogo extends StatelessWidget {
  const _SquadLogo({
    required this.slug,
    this.iconUrl,
  });

  final String slug;
  final String? iconUrl;

  @override
  Widget build(BuildContext context) {
    final img = resolveProfileMediaUrl(iconUrl);
    return Container(
      width: 24,
      height: 24,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.black, width: 2),
        boxShadow: const [
          BoxShadow(color: Colors.black26, offset: Offset(1, 1), blurRadius: 0),
        ],
      ),
      clipBehavior: Clip.hardEdge,
      child: img.isNotEmpty
          ? Image.network(img, fit: BoxFit.cover, errorBuilder: (_, _, _) => _SquadFallback(slug: slug))
          : _SquadFallback(slug: slug),
    );
  }
}

class _SquadFallback extends StatelessWidget {
  const _SquadFallback({required this.slug});

  final String slug;

  @override
  Widget build(BuildContext context) {
    final letter = slug.isNotEmpty ? slug[0].toUpperCase() : 'S';
    return ColoredBox(
      color: kSyntaxCardPrimary.withValues(alpha: 0.15),
      child: Center(
        child: Text(
          letter,
          style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: kSyntaxCardPrimary),
        ),
      ),
    );
  }
}

/// Scales the design canvas to fit its parent width (4:5 aspect).
class SyntaxCardPreview extends StatelessWidget {
  const SyntaxCardPreview({
    super.key,
    required this.data,
  });

  final SyntaxCardData data;

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: kSyntaxCardDesignWidth / kSyntaxCardDesignHeight,
      child: FittedBox(
        fit: BoxFit.contain,
        child: SizedBox(
          width: kSyntaxCardDesignWidth,
          height: kSyntaxCardDesignHeight,
          child: SyntaxCardSquare(data: data),
        ),
      ),
    );
  }
}
