import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import '../../utils/paragraph_doc.dart';
import '../../utils/paragraph_rich_spans.dart';

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
    final doc = ParagraphDoc.fromPayload(payload);
    final spans = buildParagraphRichSpans(
      doc: doc,
      baseStyle: baseStyle,
      colors: colors,
      gifSize: kParagraphInlineGifPreviewSize,
    );

    if (doc.plainText().isEmpty && doc.gifs.isEmpty) {
      return Text('', style: baseStyle);
    }

    return Text.rich(TextSpan(children: spans));
  }
}
