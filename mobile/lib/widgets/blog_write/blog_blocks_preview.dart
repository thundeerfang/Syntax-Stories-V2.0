import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/blog_block.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/blog_block_factory.dart';
import '../../utils/resolve_profile_media_url.dart';
import '../ui/dashed_border_box.dart';
import 'paragraph_rich_preview.dart';

/// Read-only preview of composed blocks for the review step.
class BlogBlocksPreview extends StatelessWidget {
  const BlogBlocksPreview({super.key, required this.blocks});

  final List<BlogBlock> blocks;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    if (blocks.isEmpty) {
      return Text(
        'No content blocks.',
        style: GoogleFonts.inter(fontSize: 13, color: colors.mutedForeground),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final block in blocks) ...[
          _BlockPreviewTile(block: block),
          const SizedBox(height: 10),
        ],
      ],
    );
  }
}

class _BlockPreviewTile extends StatelessWidget {
  const _BlockPreviewTile({required this.block});

  final BlogBlock block;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final p = block.payload;

    Widget body = switch (block.type) {
      BlogBlockType.paragraph => ParagraphRichPreview(payload: Map<String, dynamic>.from(p)),
      BlogBlockType.heading => Text(
          p['text']?.toString().trim() ?? '',
          style: GoogleFonts.inter(
            fontSize: (p['level'] == 3) ? 16 : 18,
            fontWeight: FontWeight.w800,
            color: colors.foreground,
          ),
        ),
      BlogBlockType.partition => Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: DashedDividerLine(color: colors.border),
        ),
      BlogBlockType.code => Container(
          width: double.infinity,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: colors.muted.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            p['code']?.toString() ?? '',
            style: GoogleFonts.robotoMono(fontSize: 12, color: colors.foreground),
          ),
        ),
      BlogBlockType.image || BlogBlockType.unsplashImage => _ImagePreview(block: block),
      BlogBlockType.videoEmbed => Row(
          children: [
            Icon(Icons.play_circle_outline, color: colors.primary),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                (p['videos'] is List && (p['videos'] as List).isNotEmpty)
                    ? (p['videos'] as List).first.toString()
                    : p['url']?.toString() ?? 'Video embed',
                style: GoogleFonts.inter(fontSize: 12, color: colors.mutedForeground),
              ),
            ),
          ],
        ),
      BlogBlockType.githubRepo => Text(
          p['name']?.toString() ?? '${p['owner'] ?? ''}/${p['repo'] ?? ''}',
          style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: colors.foreground),
        ),
      BlogBlockType.table => Text(
          'Table · ${(p['rows'] is List) ? (p['rows'] as List).length : 0} rows',
          style: GoogleFonts.inter(fontSize: 13, color: colors.mutedForeground),
        ),
      BlogBlockType.mermaidDiagram => Text(
          'Mermaid diagram',
          style: GoogleFonts.inter(fontSize: 13, color: colors.mutedForeground),
        ),
      _ => const SizedBox.shrink(),
    };

    if (block.type == BlogBlockType.partition) {
      return body;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          blogBlockTypeLabel(block.type).toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 9,
            fontWeight: FontWeight.w900,
            letterSpacing: 1,
            color: colors.mutedForeground,
          ),
        ),
        const SizedBox(height: 4),
        body,
      ],
    );
  }
}

class _ImagePreview extends StatelessWidget {
  const _ImagePreview({required this.block});

  final BlogBlock block;

  @override
  Widget build(BuildContext context) {
    final url = block.payload['url']?.toString();
    final resolved = url != null && url.isNotEmpty ? resolveProfileMediaUrl(url) : null;
    final bytes = block.pendingImageBytes;
    final caption = block.payload['title']?.toString() ?? block.payload['caption']?.toString();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (bytes != null)
          Image.memory(bytes, height: 120, width: double.infinity, fit: BoxFit.cover)
        else if (resolved != null && resolved.isNotEmpty)
          Image.network(resolved, height: 120, width: double.infinity, fit: BoxFit.cover),
        if (caption != null && caption.trim().isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(
            caption.trim(),
            style: GoogleFonts.inter(fontSize: 12, color: context.appColors.mutedForeground),
          ),
        ],
      ],
    );
  }
}
