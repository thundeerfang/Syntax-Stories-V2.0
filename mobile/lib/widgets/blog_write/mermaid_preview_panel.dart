import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';

String buildMermaidInkImgUrl(String source) {
  final trimmed = source.trim();
  final encoded = base64Url.encode(utf8.encode(trimmed)).replaceAll('=', '');
  return 'https://mermaid.ink/img/$encoded';
}

/// Scrollable Mermaid diagram preview (remote render via mermaid.ink, no WebView).
class MermaidPreviewPanel extends StatelessWidget {
  const MermaidPreviewPanel({super.key, required this.source});

  final String source;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final trimmed = source.trim();
    if (trimmed.isEmpty) {
      return Center(
        child: Text(
          'Add diagram source to preview',
          style: GoogleFonts.inter(fontSize: 12, color: colors.mutedForeground),
        ),
      );
    }

    final url = buildMermaidInkImgUrl(trimmed);

    return InteractiveViewer(
      minScale: 0.6,
      maxScale: 3,
      boundaryMargin: const EdgeInsets.all(24),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Image.network(
              url,
              fit: BoxFit.contain,
              loadingBuilder: (context, child, progress) {
                if (progress == null) return child;
                return SizedBox(
                  width: 120,
                  height: 80,
                  child: Center(
                    child: SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: colors.primary,
                      ),
                    ),
                  ),
                );
              },
              errorBuilder: (context, error, stackTrace) {
                return Padding(
                  padding: const EdgeInsets.all(8),
                  child: Text(
                    'Could not render diagram preview. Check syntax in Edit.',
                    style: GoogleFonts.inter(fontSize: 11, color: colors.destructive),
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
