import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import '../ui/app_select_menu.dart';

class ProfileActivitySortOption {
  const ProfileActivitySortOption({required this.value, required this.label});

  final String value;
  final String label;
}

const kNewestOldestSortOptions = [
  ProfileActivitySortOption(value: 'newest', label: 'Newest'),
  ProfileActivitySortOption(value: 'oldest', label: 'Oldest'),
];

const kAchievementFilterOptions = [
  ProfileActivitySortOption(value: 'all', label: 'All'),
  ProfileActivitySortOption(value: 'completed', label: 'Completed'),
  ProfileActivitySortOption(value: 'locked', label: 'Locked'),
  ProfileActivitySortOption(value: 'unlocked', label: 'Unlocked'),
];

/// Shared profile sort control — wraps [AppSelectMenu] for reposts and similar tabs.
class ProfileSortSelect extends StatelessWidget {
  const ProfileSortSelect({
    super.key,
    required this.value,
    required this.options,
    required this.onChanged,
    this.height = ProfileActivitySearchSortBar.sortBarHeight,
    this.minWidth = 128,
  });

  final String value;
  final List<ProfileActivitySortOption> options;
  final ValueChanged<String> onChanged;
  final double height;
  final double minWidth;

  @override
  Widget build(BuildContext context) {
    return AppSelectMenu(
      value: value,
      height: height,
      minWidth: minWidth,
      options: [
        for (final option in options)
          AppSelectOption(value: option.value, label: option.label),
      ],
      onChanged: onChanged,
    );
  }
}

/// Circular count badge — mirrors web `RailCountPill`.
class ProfileCountPill extends StatelessWidget {
  const ProfileCountPill({
    super.key,
    required this.count,
    this.semanticLabel,
  });

  final int count;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    final label = semanticLabel ?? '$count posts';

    return Semantics(
      label: label,
      child: Container(
        constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
        padding: const EdgeInsets.symmetric(horizontal: 8),
        decoration: BoxDecoration(
          color: primary.withValues(alpha: 0.12),
          shape: BoxShape.circle,
          border: Border.all(color: primary.withValues(alpha: 0.22), width: 1),
        ),
        alignment: Alignment.center,
        child: Text(
          _formatCount(count),
          style: GoogleFonts.jetBrainsMono(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            color: primary,
          ),
        ),
      ),
    );
  }

  static String _formatCount(int count) {
    if (count >= 1000000) {
      final v = count / 1000000;
      return v >= 10 ? '${v.round()}M' : '${v.toStringAsFixed(1).replaceAll(RegExp(r'\.0$'), '')}M';
    }
    if (count >= 10000) return '${(count / 1000).round()}k';
    if (count >= 1000) {
      final v = count / 1000;
      return '${v.toStringAsFixed(1).replaceAll(RegExp(r'\.0$'), '')}k';
    }
    return '$count';
  }
}

/// Circular loading placeholder — mirrors web `RailCountPillLoading`.
class ProfileCountPillSkeleton extends StatefulWidget {
  const ProfileCountPillSkeleton({super.key});

  @override
  State<ProfileCountPillSkeleton> createState() => _ProfileCountPillSkeletonState();
}

class _ProfileCountPillSkeletonState extends State<ProfileCountPillSkeleton>
    with SingleTickerProviderStateMixin {
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
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return AnimatedBuilder(
      animation: _pulse,
      builder: (context, child) {
        final alpha = 0.28 + (_pulse.value * 0.18);
        return Semantics(
          label: 'Loading post count',
          child: Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: colors.muted.withValues(alpha: alpha),
              shape: BoxShape.circle,
              border: Border.all(color: colors.border.withValues(alpha: 0.45), width: 1),
            ),
          ),
        );
      },
    );
  }
}

class ProfileActivitySearchSortBar extends StatelessWidget {
  const ProfileActivitySearchSortBar({
    super.key,
    required this.searchController,
    required this.searchHint,
    required this.sortValue,
    required this.sortOptions,
    required this.onSortChanged,
    this.countLabel,
    this.showContainer = true,
    this.inlineSearchAndSort = false,
    this.sortMinWidth = 112,
  });

  final TextEditingController searchController;
  final String searchHint;
  final String sortValue;
  final List<ProfileActivitySortOption> sortOptions;
  final ValueChanged<String> onSortChanged;
  final String? countLabel;
  final bool showContainer;
  final bool inlineSearchAndSort;
  final double sortMinWidth;

  static const sortBarHeight = 42.0;

  Widget _sortSelect(BuildContext context) {
    return ProfileSortSelect(
      value: sortValue,
      options: sortOptions,
      onChanged: onSortChanged,
      minWidth: sortMinWidth,
    );
  }

  Widget _searchField(BuildContext context) {
    final colors = context.appColors;
    return SizedBox(
      height: sortBarHeight,
      child: TextField(
        controller: searchController,
        decoration: InputDecoration(
          hintText: searchHint,
          prefixIcon: const Icon(Icons.search_rounded, size: 20),
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(vertical: 12),
          border: OutlineInputBorder(
            borderSide: BorderSide(color: colors.border, width: 2),
            borderRadius: BorderRadius.zero,
          ),
          enabledBorder: OutlineInputBorder(
            borderSide: BorderSide(color: colors.border, width: 2),
            borderRadius: BorderRadius.zero,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    final Widget content;
    if (inlineSearchAndSort) {
      content = Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(child: _searchField(context)),
          const SizedBox(width: 8),
          _sortSelect(context),
        ],
      );
    } else {
      content = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (countLabel != null)
            Row(
              children: [
                Text(
                  countLabel!,
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: colors.mutedForeground,
                  ),
                ),
                const Spacer(),
                _sortSelect(context),
              ],
            ),
          if (countLabel != null) const SizedBox(height: 10),
          _searchField(context),
        ],
      );
    }

    if (!showContainer) return content;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colors.card,
        border: Border.all(color: colors.border, width: 2),
      ),
      child: content,
    );
  }
}

class ProfileActivityEmpty extends StatelessWidget {
  const ProfileActivityEmpty({
    super.key,
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
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: colors.card,
        border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 4),
      ),
      child: Column(
        children: [
          Icon(icon, size: 28, color: colors.primary.withValues(alpha: 0.85)),
          const SizedBox(height: 12),
          Text(
            title.toUpperCase(),
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.2,
              color: colors.foreground,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 13,
              color: colors.mutedForeground,
              height: 1.4,
            ),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 16),
            TextButton(onPressed: onAction, child: Text(actionLabel!)),
          ],
        ],
      ),
    );
  }
}

class ProfileActivityError extends StatelessWidget {
  const ProfileActivityError({
    super.key,
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return ProfileActivityEmpty(
      icon: Icons.error_outline_rounded,
      title: 'Could not load',
      message: message,
      actionLabel: 'Try again',
      onAction: onRetry,
    );
  }
}
