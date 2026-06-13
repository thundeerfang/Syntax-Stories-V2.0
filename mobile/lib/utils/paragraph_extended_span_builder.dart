import 'package:extended_text_field/extended_text_field.dart';
import 'package:flutter/material.dart';

import '../theme/app_color_tokens.dart';
import 'paragraph_doc.dart';
import 'paragraph_rich_spans.dart';

/// Renders paragraph marks (bold, link, GIF) inside [ExtendedTextField] with accurate caret layout.
class ParagraphExtendedSpanBuilder extends SpecialTextSpanBuilder {
  ParagraphExtendedSpanBuilder({
    required this.doc,
    required this.colors,
    required this.baseStyle,
  });

  final ParagraphDoc doc;
  final AppColorTokens colors;
  final TextStyle baseStyle;

  @override
  SpecialText? createSpecialText(
    String flag, {
    TextStyle? textStyle,
    SpecialTextGestureTapCallback? onTap,
    required int index,
  }) {
    return null;
  }

  @override
  TextSpan build(String data, {TextStyle? textStyle, SpecialTextGestureTapCallback? onTap}) {
    if (data.isEmpty) {
      return TextSpan(text: '', style: baseStyle);
    }

    return TextSpan(
      style: baseStyle,
      children: buildParagraphRichSpans(
        doc: doc,
        displayText: data,
        baseStyle: baseStyle,
        colors: colors,
        gifSize: kParagraphInlineGifEditSize,
        forEditing: true,
      ),
    );
  }
}
