import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/squad_summary.dart';
import '../../theme/app_color_tokens.dart';
import 'squad_discover_card.dart';

/// Featured squad hero — purple gradient panel with in-container horizontal swiper.
class SquadFeaturedHeroRail extends StatefulWidget {
  const SquadFeaturedHeroRail({
    super.key,
    required this.squads,
    required this.onJoin,
    required this.onOpen,
    this.joinBusySlug,
  });

  final List<SquadSummary> squads;
  final void Function(SquadSummary squad) onJoin;
  final void Function(SquadSummary squad) onOpen;
  final String? joinBusySlug;

  static const featuredCardHeight = 196.0;
  static const _innerPad = 12.0;
  /// Slightly under full width so the next card peeks on the right.
  static const _cardWidthFactor = 0.86;

  static List<SquadSummary> pickFeatured(List<SquadSummary> squads, {int limit = 12}) {
    final rows = squads.where((s) => s.isPublic).toList()
      ..sort((a, b) {
        final byMembers = b.memberCount.compareTo(a.memberCount);
        if (byMembers != 0) return byMembers;
        return a.name.compareTo(b.name);
      });
    return rows.take(limit).toList();
  }

  @override
  State<SquadFeaturedHeroRail> createState() => _SquadFeaturedHeroRailState();
}

class _SquadFeaturedHeroRailState extends State<SquadFeaturedHeroRail> {
  final _scrollController = ScrollController();
  int _activeIndex = 0;

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  bool _handleFeaturedScroll(ScrollNotification notification, double stride, int count) {
    if (stride <= 0 || count <= 1) return false;
    if (notification is! ScrollUpdateNotification && notification is! ScrollEndNotification) {
      return false;
    }
    final next = (notification.metrics.pixels / stride).round().clamp(0, count - 1);
    if (next != _activeIndex) {
      setState(() => _activeIndex = next);
    }
    return false;
  }

  void _scrollToFeaturedIndex(int index, double stride) {
    if (!_scrollController.hasClients || stride <= 0) return;
    _scrollController.animateTo(
      index * stride,
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final featured = SquadFeaturedHeroRail.pickFeatured(widget.squads);
    if (featured.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final innerW = constraints.maxWidth;
          final scrollW = innerW - (SquadFeaturedHeroRail._innerPad * 2);
          final cardW = scrollW * SquadFeaturedHeroRail._cardWidthFactor;
          final stride = cardW + SquadFeaturedHeroRail._innerPad;

          return Container(
            width: innerW,
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  colors.primary,
                  colors.primaryHover,
                  Color.lerp(colors.primary, colors.muted, 0.35)!,
                ],
                stops: const [0.0, 0.55, 1.0],
              ),
              border: Border.all(color: colors.border, width: 2),
            ),
            child: Stack(
              children: [
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: RadialGradient(
                        center: const Alignment(1.1, -0.2),
                        radius: 0.85,
                        colors: [
                          colors.primaryForeground.withValues(alpha: 0.14),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'FEATURED',
                                  style: GoogleFonts.jetBrainsMono(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: -0.4,
                                    color: colors.primaryForeground,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'ELITE SQUADS NETWORK',
                                  style: GoogleFonts.jetBrainsMono(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 2,
                                    color: colors.primaryForeground.withValues(alpha: 0.78),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (featured.length > 1) ...[
                            const SizedBox(width: 12),
                            _FeaturedPaginationDots(
                              count: featured.length,
                              activeIndex: _activeIndex,
                              colors: colors,
                              onDotTap: (index) => _scrollToFeaturedIndex(index, stride),
                            ),
                          ],
                        ],
                      ),
                    ),
                    SizedBox(
                      height: SquadFeaturedHeroRail.featuredCardHeight,
                      child: featured.length == 1
                          ? Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: SquadFeaturedHeroRail._innerPad,
                              ),
                              child: _FeaturedSquadCard(
                                squad: featured.first,
                                joinBusySlug: widget.joinBusySlug,
                                onJoin: widget.onJoin,
                                onOpen: widget.onOpen,
                              ),
                            )
                          : NotificationListener<ScrollNotification>(
                              onNotification: (n) =>
                                  _handleFeaturedScroll(n, stride, featured.length),
                              child: ListView.separated(
                                controller: _scrollController,
                                scrollDirection: Axis.horizontal,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: SquadFeaturedHeroRail._innerPad,
                                ),
                                physics: const BouncingScrollPhysics(),
                                itemCount: featured.length,
                                separatorBuilder: (_, _) =>
                                    const SizedBox(width: SquadFeaturedHeroRail._innerPad),
                                itemBuilder: (context, index) {
                                  return SizedBox(
                                    width: cardW,
                                    child: _FeaturedSquadCard(
                                      squad: featured[index],
                                      joinBusySlug: widget.joinBusySlug,
                                      onJoin: widget.onJoin,
                                      onOpen: widget.onOpen,
                                    ),
                                  );
                                },
                              ),
                            ),
                    ),
                    const SizedBox(height: SquadFeaturedHeroRail._innerPad),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _FeaturedSquadCard extends StatelessWidget {
  const _FeaturedSquadCard({
    required this.squad,
    required this.joinBusySlug,
    required this.onJoin,
    required this.onOpen,
  });

  final SquadSummary squad;
  final String? joinBusySlug;
  final void Function(SquadSummary squad) onJoin;
  final void Function(SquadSummary squad) onOpen;

  @override
  Widget build(BuildContext context) {
    return SquadDiscoverCard(
      squad: squad,
      layout: SquadDiscoverCardLayout.vertical,
      verticalCompact: true,
      joinBusy: joinBusySlug == squad.slug,
      onJoin: () => onJoin(squad),
      onOpen: () => onOpen(squad),
    );
  }
}

class _FeaturedPaginationDots extends StatelessWidget {
  const _FeaturedPaginationDots({
    required this.count,
    required this.activeIndex,
    required this.colors,
    required this.onDotTap,
  });

  final int count;
  final int activeIndex;
  final AppColorTokens colors;
  final ValueChanged<int> onDotTap;

  @override
  Widget build(BuildContext context) {
    final dotSize = count > 8 ? 5.0 : 7.0;
    final gap = count > 8 ? 3.0 : 5.0;

    return Wrap(
      spacing: gap,
      runSpacing: gap,
      alignment: WrapAlignment.end,
      children: [
        for (var i = 0; i < count; i++)
          GestureDetector(
            onTap: () => onDotTap(i),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              width: dotSize,
              height: dotSize,
              decoration: BoxDecoration(
                color: i == activeIndex
                    ? colors.primaryForeground
                    : colors.primaryForeground.withValues(alpha: 0.28),
                border: Border.all(
                  color: i == activeIndex
                      ? colors.primaryForeground
                      : colors.primaryForeground.withValues(alpha: 0.5),
                  width: 1,
                ),
              ),
            ),
          ),
      ],
    );
  }
}
