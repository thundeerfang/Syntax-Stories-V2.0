import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/achievement_item.dart';
import '../../theme/app_color_tokens.dart';
import 'achievement_icons.dart';

/// Square achievement tile — mirrors webapp `AchievementCard`.
class AchievementCard extends StatelessWidget {
  const AchievementCard({
    super.key,
    required this.item,
  });

  final AchievementProgressItem item;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final status = item.status;
    final categoryStyle = achievementCategoryStyle(item.category, colors.primary);
    final pct = item.progressPercent.round();

    return DecoratedBox(
      decoration: BoxDecoration(
        color: status == AchievementStatus.unlocked
            ? colors.primary.withValues(alpha: 0.03)
            : status == AchievementStatus.locked
                ? colors.muted.withValues(alpha: 0.2)
                : colors.card,
        border: Border.all(
          color: status == AchievementStatus.unlocked
              ? colors.primary.withValues(alpha: 0.5)
              : colors.border,
          width: 2,
        ),
        boxShadow: status == AchievementStatus.unlocked
            ? [
                BoxShadow(
                  color: colors.primary.withValues(alpha: 0.15),
                  offset: const Offset(3, 3),
                  blurRadius: 0,
                ),
              ]
            : [
                BoxShadow(
                  color: colors.shadow.withValues(alpha: 0.08),
                  offset: const Offset(2, 2),
                  blurRadius: 0,
                ),
              ],
      ),
      child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _IconTile(
                    item: item,
                    status: status,
                    categoryStyle: categoryStyle,
                    colors: colors,
                  ),
                  const Spacer(),
                  _StatusBadge(status: status, colors: colors),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                item.title.toUpperCase(),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.4,
                  height: 1.15,
                  color: status == AchievementStatus.locked
                      ? colors.mutedForeground
                      : colors.foreground,
                ),
              ),
              const SizedBox(height: 4),
              _CategoryBadge(
                category: item.category,
                status: status,
                categoryStyle: categoryStyle,
                colors: colors,
              ),
              const SizedBox(height: 6),
              Expanded(
                child: Text(
                  status == AchievementStatus.locked
                      ? 'Complete earlier milestones to reveal this badge.'
                      : item.description,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                    height: 1.35,
                    color: status == AchievementStatus.locked
                        ? colors.mutedForeground.withValues(alpha: 0.8)
                        : colors.mutedForeground,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.only(top: 8),
                decoration: BoxDecoration(
                  border: Border(
                    top: BorderSide(
                      color: colors.border.withValues(alpha: 0.6),
                      width: 2,
                      style: BorderStyle.solid,
                    ),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        _PointsBadge(
                          points: item.points,
                          status: status,
                          colors: colors,
                        ),
                        const Spacer(),
                        if (status == AchievementStatus.unlocked &&
                            item.unlockedAt != null)
                          Text(
                            _formatUnlockedDate(item.unlockedAt!),
                            style: GoogleFonts.inter(
                              fontSize: 8,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1,
                              color: colors.primary,
                            ),
                          )
                        else if (status == AchievementStatus.inProgress)
                          Text(
                            '${item.current}/${item.target} · $pct%',
                            style: GoogleFonts.inter(
                              fontSize: 8,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.8,
                              color: colors.mutedForeground,
                            ),
                          ),
                      ],
                    ),
                    if (status == AchievementStatus.inProgress) ...[
                      const SizedBox(height: 6),
                      _ProgressBar(value: item.progressPercent / 100, colors: colors),
                    ] else if (status == AchievementStatus.locked) ...[
                      const SizedBox(height: 4),
                      Text(
                        'PROGRESS HIDDEN',
                        style: GoogleFonts.inter(
                          fontSize: 8,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1,
                          color: colors.mutedForeground,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
    );
  }

  String _formatUnlockedDate(String iso) {
    final parsed = DateTime.tryParse(iso)?.toLocal();
    if (parsed == null) return '';
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${months[parsed.month - 1]} ${parsed.day}, ${parsed.year}';
  }
}

class _IconTile extends StatelessWidget {
  const _IconTile({
    required this.item,
    required this.status,
    required this.categoryStyle,
    required this.colors,
  });

  final AchievementProgressItem item;
  final AchievementStatus status;
  final AchievementCategoryStyle categoryStyle;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final icon = resolveAchievementIcon(item.slug);

    return SizedBox(
      width: 48,
      height: 48,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: status == AchievementStatus.locked
              ? colors.muted.withValues(alpha: 0.4)
              : status == AchievementStatus.unlocked
                  ? colors.primary.withValues(alpha: 0.15)
                  : categoryStyle.tileBackground,
          border: Border.all(
            color: status == AchievementStatus.locked
                ? colors.border
                : status == AchievementStatus.unlocked
                    ? colors.primary
                    : categoryStyle.tileBorder,
            width: 2,
          ),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(
              icon,
              size: 22,
              color: status == AchievementStatus.locked
                  ? colors.mutedForeground.withValues(alpha: 0.25)
                  : status == AchievementStatus.unlocked
                      ? colors.primary
                      : categoryStyle.tileForeground,
            ),
            if (status == AchievementStatus.locked)
              ColoredBox(
                color: colors.background.withValues(alpha: 0.6),
                child: Icon(
                  Icons.lock_outline_rounded,
                  size: 18,
                  color: colors.mutedForeground,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({
    required this.status,
    required this.colors,
  });

  final AchievementStatus status;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final label = switch (status) {
      AchievementStatus.locked => 'LOCKED',
      AchievementStatus.inProgress => 'IN PROGRESS',
      AchievementStatus.unlocked => 'UNLOCKED',
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: status == AchievementStatus.unlocked
            ? colors.primary.withValues(alpha: 0.1)
            : status == AchievementStatus.locked
                ? colors.muted.withValues(alpha: 0.5)
                : colors.background,
        border: Border.all(
          color: status == AchievementStatus.unlocked
              ? colors.primary.withValues(alpha: 0.4)
              : colors.border,
          width: 2,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (status == AchievementStatus.unlocked) ...[
            Icon(Icons.check_rounded, size: 10, color: colors.primary),
            const SizedBox(width: 2),
          ],
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 7,
              fontWeight: FontWeight.w900,
              letterSpacing: 1,
              color: status == AchievementStatus.unlocked
                  ? colors.primary
                  : status == AchievementStatus.locked
                      ? colors.mutedForeground
                      : colors.foreground,
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoryBadge extends StatelessWidget {
  const _CategoryBadge({
    required this.category,
    required this.status,
    required this.categoryStyle,
    required this.colors,
  });

  final AchievementCategory category;
  final AchievementStatus status;
  final AchievementCategoryStyle categoryStyle;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        decoration: BoxDecoration(
          color: status == AchievementStatus.locked
              ? colors.muted.withValues(alpha: 0.3)
              : categoryStyle.badgeBackground,
          border: Border.all(
            color: status == AchievementStatus.locked
                ? colors.border
                : categoryStyle.badgeBorder,
          ),
        ),
        child: Text(
          achievementCategoryLabels[category]!.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 7,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.8,
            color: status == AchievementStatus.locked
                ? colors.mutedForeground
                : categoryStyle.badgeForeground,
          ),
        ),
      ),
    );
  }
}

class _PointsBadge extends StatelessWidget {
  const _PointsBadge({
    required this.points,
    required this.status,
    required this.colors,
  });

  final int points;
  final AchievementStatus status;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: status == AchievementStatus.unlocked
            ? colors.primary.withValues(alpha: 0.1)
            : colors.background,
        border: Border.all(
          color: status == AchievementStatus.unlocked
              ? colors.primary.withValues(alpha: 0.4)
              : colors.border,
          width: 2,
        ),
      ),
      child: Text(
        '+$points PTS',
        style: GoogleFonts.inter(
          fontSize: 8,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.6,
          color: status == AchievementStatus.unlocked
              ? colors.primary
              : colors.foreground,
        ),
      ),
    );
  }
}

class _ProgressBar extends StatelessWidget {
  const _ProgressBar({
    required this.value,
    required this.colors,
  });

  final double value;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 8,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colors.muted.withValues(alpha: 0.3),
          border: Border.all(color: colors.border, width: 2),
        ),
        child: Align(
          alignment: Alignment.centerLeft,
          child: FractionallySizedBox(
            widthFactor: value.clamp(0, 1),
            child: ColoredBox(color: colors.primary),
          ),
        ),
      ),
    );
  }
}
