import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/blog_block.dart';
import '../../theme/app_color_tokens.dart';
class BlogWriteToolbarItem {
  const BlogWriteToolbarItem({
    required this.type,
    required this.label,
    required this.icon,
    this.iconAsset,
  });

  final String type;
  final String label;
  final IconData icon;
  final String? iconAsset;
}

const blogWriteToolbarItems = <BlogWriteToolbarItem>[
  BlogWriteToolbarItem(type: BlogBlockType.paragraph, label: 'Paragraph', icon: Icons.notes_rounded),
  BlogWriteToolbarItem(type: BlogBlockType.heading, label: 'Heading', icon: Icons.title_rounded),
  BlogWriteToolbarItem(type: BlogBlockType.partition, label: 'Divider', icon: Icons.horizontal_rule_rounded),
  BlogWriteToolbarItem(type: BlogBlockType.code, label: 'Code', icon: Icons.code_rounded),
  BlogWriteToolbarItem(type: BlogBlockType.image, label: 'Image', icon: Icons.image_outlined),
  BlogWriteToolbarItem(type: BlogBlockType.videoEmbed, label: 'Video', icon: Icons.play_circle_outline_rounded),
  BlogWriteToolbarItem(
    type: BlogBlockType.githubRepo,
    label: 'GitHub',
    icon: Icons.code_rounded,
    iconAsset: 'assets/icons/github.svg',
  ),
  BlogWriteToolbarItem(type: BlogBlockType.unsplashImage, label: 'Unsplash', icon: Icons.photo_camera_outlined),
  BlogWriteToolbarItem(type: BlogBlockType.table, label: 'Table', icon: Icons.table_chart_outlined),
  BlogWriteToolbarItem(
    type: BlogBlockType.mermaidDiagram,
    label: 'Mermaid',
    icon: Icons.account_tree_outlined,
  ),
];

/// Horizontal block picker — mirrors webapp Tools sidebar (`DEFAULT_ITEMS`).
class BlogWriteToolbar extends StatelessWidget {
  const BlogWriteToolbar({
    super.key,
    required this.onAddBlock,
    this.disabled = false,
    this.blockCount = 0,
  });

  final ValueChanged<String> onAddBlock;
  final bool disabled;
  final int blockCount;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final atLimit = blockCount >= blogMaxBlocksPerSection;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'ADD BLOCK',
          style: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
            color: colors.mutedForeground,
          ),
        ),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final item in blogWriteToolbarItems)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ActionChip(
                    avatar: Icon(
                      item.icon,
                      size: 16,
                      color: disabled || atLimit ? colors.mutedForeground : colors.foreground,
                    ),
                    label: Text(item.label),
                    onPressed: disabled || atLimit ? null : () => onAddBlock(item.type),
                  ),
                ),
            ],
          ),
        ),
        if (atLimit)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              'Maximum $blogMaxBlocksPerSection blocks per post.',
              style: GoogleFonts.inter(fontSize: 11, color: colors.mutedForeground),
            ),
          ),
      ],
    );
  }
}
