import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/home_config.dart';
import '../../models/blog_taxonomy.dart';
import '../../theme/app_color_tokens.dart';
import 'home_fire_lottie.dart';

/// Chip row above the home hero — Tags label chip + horizontal hot-tag chips.
class HomeHeroChipsBar extends StatefulWidget {
  const HomeHeroChipsBar({
    super.key,
    required this.tags,
    required this.loading,
    required this.onOpenTopics,
    required this.onOpenTag,
  });

  final List<BlogTaxonomyRow> tags;
  final bool loading;
  final VoidCallback onOpenTopics;
  final void Function(BlogTaxonomyRow tag) onOpenTag;

  static const chipHeight = 40.0;
  static const chipGap = 8.0;

  @override
  State<HomeHeroChipsBar> createState() => _HomeHeroChipsBarState();
}

class _HomeHeroChipsBarState extends State<HomeHeroChipsBar> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
  }

  @override
  void reassemble() {
    super.reassemble();
    if (_pulse.isAnimating) _pulse.stop();
    if (widget.loading) _pulse.repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: HomeHeroChipsBar.chipHeight,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: kHomePageHorizontalPadding),
        children: [
          _TagsLabelChip(onTap: widget.onOpenTopics),
          if (widget.loading)
            for (var i = 0; i < 4; i++) ...[
              const SizedBox(width: HomeHeroChipsBar.chipGap),
              _TagChipSkeleton(width: 72 + (i * 16.0), pulse: _pulse),
            ]
          else
            for (final tag in widget.tags) ...[
              const SizedBox(width: HomeHeroChipsBar.chipGap),
              _HotTagChip(
                tag: tag,
                onTap: () => widget.onOpenTag(tag),
              ),
            ],
        ],
      ),
    );
  }
}

class _TagsLabelChip extends StatelessWidget {
  const _TagsLabelChip({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;

    return Material(
      color: primary,
      child: InkWell(
        canRequestFocus: false,
        onTap: onTap,
        child: Container(
          height: HomeHeroChipsBar.chipHeight,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            border: Border.all(color: primary, width: 2),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const HomeFireLottie(size: 20),
              const SizedBox(width: 8),
              Text(
                'Tags',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: colors.primaryForeground,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HotTagChip extends StatelessWidget {
  const _HotTagChip({
    required this.tag,
    required this.onTap,
  });

  final BlogTaxonomyRow tag;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final label = tag.name.trim().isNotEmpty ? tag.name.trim() : tag.slug;

    return Material(
      color: colors.card,
      child: InkWell(
        canRequestFocus: false,
        onTap: onTap,
        child: Container(
          height: HomeHeroChipsBar.chipHeight,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            border: Border.all(color: colors.border, width: 2),
          ),
          child: Center(
            child: Text(
              '#$label',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: colors.foreground,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TagChipSkeleton extends StatelessWidget {
  const _TagChipSkeleton({required this.width, required this.pulse});

  final double width;
  final Animation<double> pulse;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return AnimatedBuilder(
      animation: pulse,
      builder: (context, child) {
        final alpha = 0.22 + (pulse.value * 0.18);
        return Container(
          height: HomeHeroChipsBar.chipHeight,
          width: width,
          decoration: BoxDecoration(
            border: Border.all(color: colors.border.withValues(alpha: 0.65), width: 2),
            color: colors.muted.withValues(alpha: alpha),
          ),
        );
      },
    );
  }
}

/// Merge explore tag lanes — mirrors web `mergeHotTags`.
List<BlogTaxonomyRow> mergeHomeHotTags(BlogTagsExplore explore, {int limit = 18}) {
  final seen = <String>{};
  final out = <BlogTaxonomyRow>[];

  void addAll(List<BlogTaxonomyRow> rows) {
    for (final row in rows) {
      if (seen.add(row.slug)) out.add(row);
      if (out.length >= limit) return;
    }
  }

  addAll(explore.popular);
  if (out.length < limit) addAll(explore.trending);
  if (out.length < limit) addAll(explore.recent);
  return out;
}
