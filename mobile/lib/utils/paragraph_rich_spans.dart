import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme/app_color_tokens.dart';
import 'paragraph_doc.dart';

/// Styled inline spans for paragraph editing / preview (bold, italic, underline, link, GIF).
List<InlineSpan> buildParagraphRichSpans({
  required ParagraphDoc doc,
  required TextStyle baseStyle,
  required AppColorTokens colors,
  String? displayText,
  double gifSize = kParagraphInlineGifSize,
  bool forEditing = false,
}) {
  final spans = <InlineSpan>[];
  final text = displayText ?? doc.editingText;
  var cursor = 0;
  var gifIndex = 0;

  while (cursor < text.length) {
    if (text[cursor] == kParagraphGifPlaceholder) {
      if (gifIndex < doc.gifs.length && doc.gifs[gifIndex].url.isNotEmpty) {
        spans.add(
          WidgetSpan(
            alignment: PlaceholderAlignment.baseline,
            baseline: TextBaseline.alphabetic,
            child: Padding(
              padding: const EdgeInsets.only(right: 2),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(3),
                child: Image.network(
                  doc.gifs[gifIndex].url,
                  height: gifSize,
                  width: gifSize,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) =>
                      Icon(Icons.gif, size: gifSize * 0.85, color: colors.primary),
                ),
              ),
            ),
          ),
        );
      } else {
        spans.add(TextSpan(text: ' ', style: baseStyle));
      }
      gifIndex++;
      cursor = paragraphGifSlotEnd(text, cursor);
      continue;
    }

    final nextGif = text.indexOf(kParagraphGifPlaceholder, cursor);
    final end = nextGif == -1 ? text.length : nextGif;
    spans.addAll(_spansForTextRange(
      doc,
      cursor,
      end,
      baseStyle,
      colors,
      text,
      forEditing: forEditing,
    ));
    cursor = end;
  }

  if (spans.isEmpty) {
    spans.add(TextSpan(text: '', style: baseStyle));
  }
  return spans;
}

bool _stylesEqual(ParagraphTextStyle a, ParagraphTextStyle b) {
  return a.bold == b.bold &&
      a.italic == b.italic &&
      a.underline == b.underline &&
      a.linkHref == b.linkHref;
}

List<InlineSpan> _spansForTextRange(
  ParagraphDoc doc,
  int rangeStart,
  int rangeEnd,
  TextStyle baseStyle,
  AppColorTokens colors,
  String text, {
  bool forEditing = false,
}) {
  if (rangeStart >= rangeEnd) return const [];

  final spans = <InlineSpan>[];
  var i = rangeStart;

  while (i < rangeEnd) {
    if (isParagraphGifSlotTailIndex(text, i)) {
      i++;
      continue;
    }

    final style = doc.styleForRange(i, i + 1);
    var j = i + 1;
    while (j < rangeEnd && !isParagraphGifSlotTailIndex(text, j)) {
      if (text[j] == '\n' &&
          style.linkHref != null &&
          style.linkHref!.isNotEmpty) {
        break;
      }
      final nextStyle = doc.styleForRange(j, j + 1);
      if (!_stylesEqual(style, nextStyle)) break;
      j++;
    }

    final segment = text.substring(i, j);
    if (segment.isEmpty) {
      i = j;
      continue;
    }

    final hasLink = style.linkHref != null && style.linkHref!.isNotEmpty;
    if (hasLink) {
      spans.addAll(
        _linkSpansForSegment(
          segment: segment,
          style: style,
          baseStyle: baseStyle,
          colors: colors,
          forEditing: forEditing,
        ),
      );
    } else {
      spans.add(
        TextSpan(
          text: segment,
          style: baseStyle.copyWith(
            fontWeight: style.bold ? FontWeight.w700 : FontWeight.w400,
            fontStyle: style.italic ? FontStyle.italic : FontStyle.normal,
            decoration: style.underline ? TextDecoration.underline : TextDecoration.none,
            decorationColor: colors.foreground,
          ),
        ),
      );
    }

    i = j;
  }

  return spans;
}

List<InlineSpan> _linkSpansForSegment({
  required String segment,
  required ParagraphTextStyle style,
  required TextStyle baseStyle,
  required AppColorTokens colors,
  bool forEditing = false,
}) {
  final spans = <InlineSpan>[];
  var partStart = 0;

  for (var i = 0; i <= segment.length; i++) {
    if (i == segment.length || segment[i] == '\n') {
      final part = segment.substring(partStart, i);
      if (part.isNotEmpty) {
        if (forEditing) {
          spans.add(
            TextSpan(
              text: part,
              style: baseStyle.copyWith(
                color: colors.primary,
                fontWeight: style.bold ? FontWeight.w700 : FontWeight.w600,
                fontStyle: style.italic ? FontStyle.italic : FontStyle.normal,
                decoration: TextDecoration.underline,
                decorationColor: colors.primary,
              ),
            ),
          );
        } else {
          spans.add(
            WidgetSpan(
              alignment: PlaceholderAlignment.baseline,
              baseline: TextBaseline.alphabetic,
              child: _ParagraphLinkChip(
                label: part,
                colors: colors,
                bold: style.bold,
                italic: style.italic,
                underline: style.underline,
              ),
            ),
          );
        }
      }
      if (i < segment.length) {
        spans.add(TextSpan(text: '\n', style: baseStyle));
      }
      partStart = i + 1;
    }
  }

  return spans;
}

class _ParagraphLinkChip extends StatelessWidget {
  const _ParagraphLinkChip({
    required this.label,
    required this.colors,
    required this.bold,
    required this.italic,
    required this.underline,
  });

  final String label;
  final AppColorTokens colors;
  final bool bold;
  final bool italic;
  final bool underline;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 1),
      padding: const EdgeInsets.fromLTRB(5, 1, 6, 1),
      decoration: BoxDecoration(
        color: colors.primary.withValues(alpha: 0.12),
        border: Border.all(color: colors.primary, width: 1.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.link_rounded, size: 12, color: colors.primary),
          const SizedBox(width: 3),
          Text(
            label,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.inter(
              fontSize: 12,
              height: 1.2,
              color: colors.primary,
              fontWeight: bold ? FontWeight.w700 : FontWeight.w600,
              fontStyle: italic ? FontStyle.italic : FontStyle.normal,
              decoration: underline ? TextDecoration.underline : TextDecoration.none,
              decorationColor: colors.primary,
            ),
          ),
        ],
      ),
    );
  }
}
