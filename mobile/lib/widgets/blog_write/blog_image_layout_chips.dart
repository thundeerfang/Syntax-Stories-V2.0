import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';

const kBlogImageLayouts = ['landscape', 'square', 'fullWidth'];

class BlogImageLayoutOption {
  const BlogImageLayoutOption({
    required this.id,
    required this.label,
    required this.icon,
  });

  final String id;
  final String label;
  final IconData icon;
}

const kBlogImageLayoutOptions = [
  BlogImageLayoutOption(
    id: 'landscape',
    label: 'Landscape',
    icon: Icons.crop_landscape_rounded,
  ),
  BlogImageLayoutOption(
    id: 'square',
    label: 'Square',
    icon: Icons.crop_square_rounded,
  ),
  BlogImageLayoutOption(
    id: 'fullWidth',
    label: 'Full Width',
    icon: Icons.width_full_rounded,
  ),
];

String coerceBlogImageLayout(String? raw) {
  final value = raw?.trim() ?? '';
  if (kBlogImageLayouts.contains(value)) return value;
  return 'landscape';
}

class BlogImageLayoutChips extends StatelessWidget {
  const BlogImageLayoutChips({
    super.key,
    required this.selected,
    required this.onSelected,
  });

  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Row(
      children: [
        for (var i = 0; i < kBlogImageLayoutOptions.length; i++) ...[
          if (i > 0) const SizedBox(width: 8),
          Expanded(
            child: _LayoutChip(
              option: kBlogImageLayoutOptions[i],
              selected: selected == kBlogImageLayoutOptions[i].id,
              colors: colors,
              onSelected: () => onSelected(kBlogImageLayoutOptions[i].id),
            ),
          ),
        ],
      ],
    );
  }
}

class _LayoutChip extends StatelessWidget {
  const _LayoutChip({
    required this.option,
    required this.selected,
    required this.colors,
    required this.onSelected,
  });

  final BlogImageLayoutOption option;
  final bool selected;
  final AppColorTokens colors;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) {
    final foreground = selected ? colors.primary : colors.foreground;
    final iconColor = selected ? colors.primary : colors.mutedForeground;

    return Material(
      color: selected ? colors.primary.withValues(alpha: 0.12) : colors.muted.withValues(alpha: 0.2),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(4),
        side: BorderSide(
          color: selected ? colors.primary : colors.border,
          width: 1.5,
        ),
      ),
      child: InkWell(
        onTap: onSelected,
        borderRadius: BorderRadius.circular(4),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(option.icon, size: 14, color: iconColor),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  option.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: foreground,
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
