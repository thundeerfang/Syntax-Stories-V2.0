import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import '../../utils/paragraph_doc.dart';
import '../../utils/paragraph_interactions.dart';
import '../../utils/paragraph_rich_spans.dart';
import '../../utils/resolve_profile_media_url.dart';

const _previewTextHeightBehavior = TextHeightBehavior(
  applyHeightToFirstAscent: false,
  applyHeightToLastDescent: false,
);

String _trimTrailingNewlines(String text) {
  var end = text.length;
  while (end > 0 && text[end - 1] == '\n') {
    end--;
  }
  return text.substring(0, end);
}

bool _docNeedsWrapLayout(ParagraphDoc doc) =>
    doc.gifs.isNotEmpty ||
    doc.mentions.isNotEmpty ||
    doc.editingText.contains(kParagraphGifPlaceholder) ||
    doc.editingText.contains(kParagraphMentionPlaceholder);

bool _isParagraphBlockEmpty(Map block) {
  final nodes = block['content'];
  return nodes is! List || nodes.isEmpty;
}

List<Map<String, dynamic>> _paragraphBlocksFromPayload(Map<String, dynamic> payload) {
  final doc = payload['doc'];
  if (doc is! Map<String, dynamic>) return const [];
  final content = doc['content'];
  if (content is! List) return const [];

  final blocks = <Map<String, dynamic>>[];
  for (final block in content) {
    if (block is! Map) continue;
    if (block['type']?.toString() != 'paragraph') continue;
    blocks.add(Map<String, dynamic>.from(block));
  }
  return blocks;
}

Map<String, dynamic> _singleParagraphPayload(Map<String, dynamic> block) => {
      'doc': {
        'type': 'doc',
        'content': [block],
      },
      'version': 'rich-text',
    };

const double _paragraphBlockGap = 12;

/// Read-only rich paragraph preview from TipTap-compatible payload.
class ParagraphRichPreview extends StatelessWidget {
  const ParagraphRichPreview({
    super.key,
    required this.payload,
    this.style,
  });

  final Map<String, dynamic> payload;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final baseStyle = style ??
        GoogleFonts.inter(fontSize: 14, height: 1.5, color: colors.foreground);

    final paragraphBlocks = _paragraphBlocksFromPayload(payload);
    if (paragraphBlocks.length > 1) {
      return _MultiParagraphPreview(
        blocks: paragraphBlocks,
        baseStyle: baseStyle,
        colors: colors,
      );
    }

    return _SingleParagraphPreview(
      payload: payload,
      baseStyle: baseStyle,
      colors: colors,
    );
  }
}

class _MultiParagraphPreview extends StatelessWidget {
  const _MultiParagraphPreview({
    required this.blocks,
    required this.baseStyle,
    required this.colors,
  });

  final List<Map<String, dynamic>> blocks;
  final TextStyle baseStyle;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final children = <Widget>[];

    for (final block in blocks) {
      if (_isParagraphBlockEmpty(block)) {
        children.add(const SizedBox(height: _paragraphBlockGap));
        continue;
      }

      if (children.isNotEmpty) {
        children.add(const SizedBox(height: _paragraphBlockGap));
      }

      children.add(
        _SingleParagraphPreview(
          payload: _singleParagraphPayload(block),
          baseStyle: baseStyle,
          colors: colors,
        ),
      );
    }

    if (children.isEmpty) {
      return Text('', style: baseStyle);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: children,
    );
  }
}

class _SingleParagraphPreview extends StatelessWidget {
  const _SingleParagraphPreview({
    required this.payload,
    required this.baseStyle,
    required this.colors,
  });

  final Map<String, dynamic> payload;
  final TextStyle baseStyle;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final doc = ParagraphDoc.fromPayload(payload);
    final gifSize = kParagraphInlineGifPreviewSize;

    if (doc.plainText().isEmpty && doc.gifs.isEmpty && doc.mentions.isEmpty) {
      return Text('', style: baseStyle);
    }

    if (_docNeedsWrapLayout(doc)) {
      return _WrapParagraphPreview(
        doc: doc,
        baseStyle: baseStyle,
        colors: colors,
        gifSize: gifSize,
      );
    }

    final spans = buildParagraphRichSpans(
      doc: doc,
      baseStyle: baseStyle,
      colors: colors,
      gifSize: gifSize,
      displayText: _trimTrailingNewlines(doc.editingText),
    );

    return Text.rich(
      TextSpan(children: spans),
      style: baseStyle,
      textHeightBehavior: _previewTextHeightBehavior,
    );
  }
}

/// Inline GIF / @mention + text without [Text.rich] [WidgetSpan] line-height inflation.
class _WrapParagraphPreview extends StatelessWidget {
  const _WrapParagraphPreview({
    required this.doc,
    required this.baseStyle,
    required this.colors,
    required this.gifSize,
  });

  final ParagraphDoc doc;
  final TextStyle baseStyle;
  final AppColorTokens colors;
  final double gifSize;

  @override
  Widget build(BuildContext context) {
    final text = _trimTrailingNewlines(doc.editingText);
    final children = <Widget>[];
    var cursor = 0;
    var gifIndex = 0;
    var mentionIndex = 0;

    while (cursor < text.length) {
      if (text[cursor] == kParagraphMentionPlaceholder) {
        if (mentionIndex < doc.mentions.length &&
            doc.mentions[mentionIndex].username.trim().isNotEmpty) {
          children.add(
            ParagraphMentionPreviewChip(
              mention: doc.mentions[mentionIndex],
              colors: colors,
            ),
          );
        }
        mentionIndex++;
        cursor = paragraphMentionSlotEnd(text, cursor);
        continue;
      }

      if (text[cursor] == kParagraphGifPlaceholder) {
        children.add(
          ParagraphInlineGifThumb(
            gif: gifIndex < doc.gifs.length ? doc.gifs[gifIndex] : const ParagraphGif(url: ''),
            size: gifSize,
            colors: colors,
          ),
        );
        gifIndex++;
        cursor = paragraphGifSlotEnd(text, cursor);
        continue;
      }

      final nextAtom = nextParagraphInlineAtomIndex(text, cursor);
      final end = nextAtom ?? text.length;
      if (end > cursor) {
        final spans = buildParagraphRichSpansForRange(
          doc: doc,
          baseStyle: baseStyle,
          colors: colors,
          start: cursor,
          end: end,
          displayText: text,
        );
        if (spans.isNotEmpty) {
          children.add(
            Text.rich(
              TextSpan(children: spans),
              style: baseStyle,
              textHeightBehavior: _previewTextHeightBehavior,
            ),
          );
        }
      }
      cursor = end;
    }

    if (children.isEmpty) {
      return Text('', style: baseStyle);
    }

    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 2,
      runSpacing: 4,
      children: children,
    );
  }
}

class ParagraphMentionPreviewChip extends StatelessWidget {
  const ParagraphMentionPreviewChip({
    super.key,
    required this.mention,
    required this.colors,
  });

  final ParagraphMention mention;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final avatarUrl = resolveProfileMediaUrl(mention.profileImg);
    final handle = mention.username.trim();

    return Padding(
      padding: const EdgeInsets.only(right: 4),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => openParagraphMentionProfile(context, mention),
          child: Container(
            padding: const EdgeInsets.fromLTRB(4, 1, 6, 1),
            decoration: BoxDecoration(
              color: colors.primary.withValues(alpha: 0.1),
              border: Border.all(color: colors.primary.withValues(alpha: 0.6)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                ClipRRect(
                  child: avatarUrl.isNotEmpty
                      ? Image.network(
                          avatarUrl,
                          width: 14,
                          height: 14,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => _avatarFallback(handle),
                        )
                      : _avatarFallback(handle),
                ),
                const SizedBox(width: 4),
                Text(
                  mention.displayLabel,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    height: 1.2,
                    color: colors.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _avatarFallback(String handle) {
    final seed = handle.isNotEmpty ? handle : 'user';
    return Image.network(
      'https://api.dicebear.com/7.x/avataaars/svg?seed=${Uri.encodeComponent(seed)}',
      width: 14,
      height: 14,
      fit: BoxFit.cover,
      errorBuilder: (_, _, _) => Icon(Icons.person, size: 12, color: colors.primary),
    );
  }
}
