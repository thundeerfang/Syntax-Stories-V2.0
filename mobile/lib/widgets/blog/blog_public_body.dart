import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/blog_block.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/blog_code_language.dart';
import '../blog_write/blog_image_layout_chips.dart';
import '../blog_write/paragraph_rich_preview.dart';
import 'blog_code_block_display.dart';
import 'blog_heading_block.dart';
import 'blog_partition_divider.dart';
import 'blog_public_image_block.dart';

/// Horizontal inset for public blog body blocks (full-width images break out).
const double kBlogPostContentPadding = 16;

/// Read-only public blog body — mirrors webapp `BlogPublicBody` (no editor labels).
class BlogPublicBody extends StatelessWidget {
  const BlogPublicBody({super.key, required this.content});

  final String content;

  @override
  Widget build(BuildContext context) {
    final blocks = parseBlogBlocksJson(content);
    if (blocks.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < blocks.length; i++) ...[
          _wrapPublicBlock(blocks[i], _PublicBlock(block: blocks[i])),
          if (i < blocks.length - 1) const SizedBox(height: 14),
        ],
      ],
    );
  }
}

bool _isFullWidthImageBlock(BlogBlock block) {
  if (block.type != BlogBlockType.image && block.type != BlogBlockType.unsplashImage) {
    return false;
  }
  return coerceBlogImageLayout(block.payload['layout']?.toString()) == 'fullWidth';
}

Widget _wrapPublicBlock(BlogBlock block, Widget child) {
  if (_isFullWidthImageBlock(block)) return child;
  return Padding(
    padding: const EdgeInsets.symmetric(horizontal: kBlogPostContentPadding),
    child: child,
  );
}

class _PublicBlock extends StatelessWidget {
  const _PublicBlock({required this.block});

  final BlogBlock block;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final p = block.payload;

    return switch (block.type) {
      BlogBlockType.paragraph => ParagraphRichPreview(
          payload: Map<String, dynamic>.from(p),
          style: GoogleFonts.inter(
            fontSize: 15,
            height: 1.65,
            color: colors.foreground.withValues(alpha: 0.92),
          ),
        ),
      BlogBlockType.heading => BlogHeadingBlock(
          text: p['text']?.toString().trim() ?? '',
          level: blogHeadingLevelFromPayload(p),
        ),
      BlogBlockType.partition => const BlogPartitionDivider(),
      BlogBlockType.code => _PublicCodeBlock(payload: p),
      BlogBlockType.image => BlogPublicImageBlock(block: block),
      BlogBlockType.unsplashImage => BlogPublicUnsplashImageBlock(block: block),
      BlogBlockType.videoEmbed => _VideoEmbed(payload: p, colors: colors),
      BlogBlockType.githubRepo => _GithubRepo(payload: p, colors: colors),
      BlogBlockType.table => _TablePreview(payload: p, colors: colors),
      BlogBlockType.mermaidDiagram => Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            border: Border.all(color: colors.border, width: 2),
            color: colors.muted.withValues(alpha: 0.15),
          ),
          child: Text(
            'Diagram',
            style: GoogleFonts.inter(fontSize: 13, color: colors.mutedForeground),
          ),
        ),
      _ => const SizedBox.shrink(),
    };
  }
}

class _PublicCodeBlock extends StatelessWidget {
  const _PublicCodeBlock({required this.payload});

  final Map<String, dynamic> payload;

  @override
  Widget build(BuildContext context) {
    final code = blogCodeTextFromPayload(payload);
    if (code.trim().isEmpty) return const SizedBox.shrink();
    return BlogCodeBlockDisplay(
      code: code,
      languageHint: payload['language']?.toString(),
    );
  }
}

class _VideoEmbed extends StatelessWidget {
  const _VideoEmbed({required this.payload, required this.colors});

  final Map<String, dynamic> payload;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final videos = payload['videos'];
    final url = videos is List && videos.isNotEmpty
        ? videos.first.toString()
        : payload['url']?.toString() ?? '';

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: colors.border, width: 2),
        color: colors.muted.withValues(alpha: 0.12),
      ),
      child: Row(
        children: [
          Icon(Icons.play_circle_outline, color: colors.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              url.isNotEmpty ? url : 'Video embed',
              style: GoogleFonts.inter(fontSize: 12, color: colors.mutedForeground),
            ),
          ),
        ],
      ),
    );
  }
}

class _GithubRepo extends StatelessWidget {
  const _GithubRepo({required this.payload, required this.colors});

  final Map<String, dynamic> payload;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final name = payload['name']?.toString();
    final label = name != null && name.isNotEmpty
        ? name
        : '${payload['owner'] ?? ''}/${payload['repo'] ?? ''}';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        border: Border.all(color: colors.border, width: 2),
      ),
      child: Row(
        children: [
          Icon(Icons.code, size: 18, color: colors.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: colors.foreground,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TablePreview extends StatelessWidget {
  const _TablePreview({required this.payload, required this.colors});

  final Map<String, dynamic> payload;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final rows = payload['rows'];
    if (rows is! List || rows.isEmpty) return const SizedBox.shrink();

    final parsed = rows
        .whereType<List>()
        .map((r) => r.map((c) => c?.toString() ?? '').toList())
        .toList();
    if (parsed.isEmpty) return const SizedBox.shrink();

    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: colors.border, width: 2),
      ),
      child: Table(
        border: TableBorder(
          horizontalInside: BorderSide(color: colors.border.withValues(alpha: 0.6)),
          verticalInside: BorderSide(color: colors.border.withValues(alpha: 0.6)),
        ),
        defaultVerticalAlignment: TableCellVerticalAlignment.middle,
        children: [
          for (var i = 0; i < parsed.length; i++)
            TableRow(
              decoration: i == 0
                  ? BoxDecoration(color: colors.muted.withValues(alpha: 0.2))
                  : null,
              children: [
                for (final cell in parsed[i])
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                    child: Text(
                      cell,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: i == 0 ? FontWeight.w700 : FontWeight.w500,
                        color: colors.foreground,
                      ),
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}
