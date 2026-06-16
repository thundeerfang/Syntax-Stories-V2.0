import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_highlight/flutter_highlight.dart';
import 'package:flutter_highlight/themes/atom-one-dark.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import '../ui/app_feedback_toast.dart';
import '../../utils/blog_code_language.dart';

/// Read-only code block — mirrors webapp `BlogCodeBlockDisplay`.
class BlogCodeBlockDisplay extends StatefulWidget {
  const BlogCodeBlockDisplay({
    super.key,
    required this.code,
    this.languageHint,
  });

  final String code;
  final String? languageHint;

  @override
  State<BlogCodeBlockDisplay> createState() => _BlogCodeBlockDisplayState();
}

class _BlogCodeBlockDisplayState extends State<BlogCodeBlockDisplay> {
  bool _copied = false;

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: widget.code));
    if (!mounted) return;
    setState(() => _copied = true);
    AppFeedbackToast.success(context, 'Copied to clipboard');
    Future<void>.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final language = inferBlogCodeLanguage(widget.code, languageHint: widget.languageHint);
    final languageLabel = blogCodeLanguageLabel(language);
    final highlightLanguage = blogCodeHighlightLanguage(language);
    final codeStyle = GoogleFonts.jetBrainsMono(
      fontSize: 13,
      height: 1.55,
      color: const Color(0xFFE4E4E7),
    );
    final highlightTheme = Map<String, TextStyle>.from(atomOneDarkTheme);
    highlightTheme['root'] = atomOneDarkTheme['root']!.copyWith(
      backgroundColor: Colors.transparent,
      color: const Color(0xFFE4E4E7),
    );

    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: colors.border, width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DecoratedBox(
            decoration: BoxDecoration(
              color: const Color(0xFF18181B),
              border: Border(bottom: BorderSide(color: colors.border, width: 2)),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      languageLabel,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.jetBrainsMono(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.8,
                        color: const Color(0xFFA1A1AA),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Material(
                    color: const Color(0xFF27272A),
                    child: InkWell(
                      onTap: _copy,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          border: Border.all(color: const Color(0xFF52525B), width: 2),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              _copied ? Icons.check_rounded : Icons.copy_rounded,
                              size: 14,
                              color: const Color(0xFFF4F4F5),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              _copied ? 'COPIED' : 'COPY',
                              style: GoogleFonts.jetBrainsMono(
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.6,
                                color: const Color(0xFFF4F4F5),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Container(
            width: double.infinity,
            color: const Color(0xFF09090B),
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 14),
            child: HighlightView(
              widget.code,
              language: highlightLanguage,
              theme: highlightTheme,
              padding: EdgeInsets.zero,
              textStyle: codeStyle,
            ),
          ),
        ],
      ),
    );
  }
}
