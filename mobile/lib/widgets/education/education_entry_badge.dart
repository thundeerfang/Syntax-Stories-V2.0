import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/education_item.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/profile_month_year.dart';
import '../../utils/resolve_profile_media_url.dart';

class EducationEntryBadge extends StatelessWidget {
  const EducationEntryBadge({
    super.key,
    required this.item,
    required this.onRemove,
    this.onEdit,
    this.showActions = true,
  });

  final EducationItem item;
  final VoidCallback onRemove;
  final VoidCallback? onEdit;
  final bool showActions;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final logo = resolveProfileMediaUrl(item.schoolLogo ?? '');
    final range = _dateRange(item);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: colors.card,
        border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 2),
      ),
      child: Stack(
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(12, 12, showActions ? 44 : 12, 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 2),
                    color: colors.muted.withValues(alpha: 0.12),
                  ),
                  clipBehavior: Clip.hardEdge,
                  child: logo.isNotEmpty
                      ? Image.network(logo, fit: BoxFit.cover)
                      : Icon(Icons.school_outlined, color: colors.primary),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.school.toUpperCase(),
                        style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        item.degree.toUpperCase(),
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: colors.primary,
                        ),
                      ),
                      if (item.fieldOfStudy?.trim().isNotEmpty == true) ...[
                        const SizedBox(height: 4),
                        Text(
                          item.fieldOfStudy!.toUpperCase(),
                          style: GoogleFonts.inter(fontSize: 9, color: colors.mutedForeground),
                        ),
                      ],
                      if (range.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          range,
                          style: GoogleFonts.inter(fontSize: 9, color: colors.mutedForeground),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (showActions)
            Positioned(
              top: 4,
              right: 4,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (onEdit != null)
                    IconButton(
                      onPressed: onEdit,
                      icon: Icon(Icons.edit_outlined, size: 18, color: colors.mutedForeground),
                    ),
                  IconButton(
                    onPressed: onRemove,
                    icon: Icon(Icons.delete_outline_rounded, size: 18, color: colors.destructive),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  String _dateRange(EducationItem item) {
    final start = formatMonthYearLabel(item.startDate);
    if (item.currentEducation) return start.isEmpty ? 'PRESENT' : '$start — PRESENT';
    final end = formatMonthYearLabel(item.endDate);
    if (start.isEmpty && end.isEmpty) return '';
    if (start.isEmpty) return end;
    if (end.isEmpty) return start;
    return '$start — $end';
  }
}

class EducationEntryBadgeList extends StatelessWidget {
  const EducationEntryBadgeList({
    super.key,
    required this.items,
    required this.onRemoveAt,
    required this.onEditAt,
  });

  final List<EducationItem> items;
  final ValueChanged<int> onRemoveAt;
  final ValueChanged<int> onEditAt;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < items.length; i++) ...[
          EducationEntryBadge(
            item: items[i],
            onEdit: () => onEditAt(i),
            onRemove: () => onRemoveAt(i),
          ),
          if (i < items.length - 1) const SizedBox(height: 10),
        ],
      ],
    );
  }
}
