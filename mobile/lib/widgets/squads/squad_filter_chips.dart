import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import '../../utils/squad_category.dart';
import '../ui/app_tappable.dart';

/// Squads browse filter — `all`, `mine`, or a [squadCategoryValues] id.
sealed class SquadBrowseFilter {
  const SquadBrowseFilter();
}

class SquadBrowseFilterAll extends SquadBrowseFilter {
  const SquadBrowseFilterAll();
}

class SquadBrowseFilterMine extends SquadBrowseFilter {
  const SquadBrowseFilterMine();
}

class SquadBrowseFilterCategory extends SquadBrowseFilter {
  const SquadBrowseFilterCategory(this.categoryId);

  final String categoryId;
}

/// Single-line horizontal chips: All (default), My Squads, then squad categories.
class SquadFilterChips extends StatelessWidget {
  const SquadFilterChips({
    super.key,
    required this.selected,
    required this.onSelected,
  });

  final SquadBrowseFilter selected;
  final ValueChanged<SquadBrowseFilter> onSelected;

  bool _isSelected(SquadBrowseFilter filter) {
    return switch ((selected, filter)) {
      (SquadBrowseFilterAll(), SquadBrowseFilterAll()) => true,
      (SquadBrowseFilterMine(), SquadBrowseFilterMine()) => true,
      (SquadBrowseFilterCategory a, SquadBrowseFilterCategory b) => a.categoryId == b.categoryId,
      _ => false,
    };
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          SquadChip(
            label: 'All',
            selected: _isSelected(const SquadBrowseFilterAll()),
            onTap: () => onSelected(const SquadBrowseFilterAll()),
          ),
          const SizedBox(width: 8),
          SquadChip(
            label: 'My Squads',
            selected: _isSelected(const SquadBrowseFilterMine()),
            onTap: () => onSelected(const SquadBrowseFilterMine()),
          ),
          for (final id in squadCategoryValues) ...[
            const SizedBox(width: 8),
            SquadChip(
              label: squadCategoryLabel(id),
              selected: _isSelected(SquadBrowseFilterCategory(id)),
              onTap: () => onSelected(SquadBrowseFilterCategory(id)),
            ),
          ],
        ],
      ),
    );
  }
}

class SquadChip extends StatelessWidget {
  const SquadChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return AppTappable(
      onTap: onTap,
      splashColor: appRippleOnSurface(colors),
      decoration: BoxDecoration(
        color: selected ? colors.primary.withValues(alpha: 0.12) : colors.card,
        border: Border.all(
          color: selected ? colors.primary : colors.border,
          width: selected ? 1.5 : 1,
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      child: Text(
        label,
        style: GoogleFonts.inter(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: selected ? colors.primary : colors.foreground,
        ),
      ),
    );
  }
}
