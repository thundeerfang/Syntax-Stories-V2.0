import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import '../../utils/blog_streak_limits.dart';

class BlogStreakModeSelector extends StatelessWidget {
  const BlogStreakModeSelector({
    super.key,
    required this.value,
    required this.onChanged,
    this.disabled = false,
  });

  final String value;
  final ValueChanged<String> onChanged;
  final bool disabled;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'PROFILE DISPLAY',
          style: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
            color: colors.mutedForeground,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            for (var i = 0; i < blogStreakModes.length; i++) ...[
              if (i > 0) const SizedBox(width: 6),
              Expanded(
                child: _ModeTab(
                  mode: blogStreakModes[i],
                  selected: value == blogStreakModes[i],
                  disabled: disabled,
                  onTap: disabled ? null : () => onChanged(blogStreakModes[i]),
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}

class _ModeTab extends StatelessWidget {
  const _ModeTab({
    required this.mode,
    required this.selected,
    required this.disabled,
    this.onTap,
  });

  final String mode;
  final bool selected;
  final bool disabled;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final label = blogStreakModeLabel(mode).toUpperCase();

    return Material(
      color: selected ? colors.primary : colors.card,
      child: InkWell(
        onTap: disabled ? null : onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
          decoration: BoxDecoration(
            border: Border.all(
              color: selected ? colors.primary : colors.border.withValues(alpha: 0.85),
              width: 2,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (selected) ...[
                Icon(
                  blogStreakModeIcon(mode),
                  size: 14,
                  color: colors.primaryForeground,
                ),
                const SizedBox(width: 4),
              ],
              Flexible(
                child: Text(
                  label,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.3,
                    color: selected ? colors.primaryForeground : colors.foreground,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class ReadStreakPayloadView {
  const ReadStreakPayloadView({
    required this.currentByMode,
    required this.longestByMode,
    this.totalDistinctReadDays = 0,
  });

  final Map<String, int> currentByMode;
  final Map<String, int> longestByMode;
  final int totalDistinctReadDays;

  int currentFor(String mode) => currentByMode[mode] ?? 0;
  int longestFor(String mode) => longestByMode[mode] ?? 0;
}

class BlogStreakMetricCard extends StatelessWidget {
  const BlogStreakMetricCard({
    super.key,
    required this.title,
    required this.current,
    required this.longest,
    this.highlighted = false,
  });

  final String title;
  final int current;
  final int longest;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final borderColor = highlighted ? colors.primary : colors.border.withValues(alpha: 0.85);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: highlighted ? colors.primary.withValues(alpha: 0.08) : colors.card,
        border: Border.all(color: borderColor, width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: GoogleFonts.inter(
              fontSize: 9,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.8,
              color: highlighted ? colors.primary : colors.mutedForeground,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '$current',
            style: GoogleFonts.inter(
              fontSize: 26,
              fontWeight: FontWeight.w900,
              fontStyle: FontStyle.italic,
              color: colors.foreground,
            ),
          ),
          Text(
            'CURRENT',
            style: GoogleFonts.inter(
              fontSize: 8,
              fontWeight: FontWeight.w700,
              color: colors.mutedForeground,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            '$longest',
            style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          Text(
            'LONGEST',
            style: GoogleFonts.inter(
              fontSize: 8,
              fontWeight: FontWeight.w700,
              color: colors.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}
