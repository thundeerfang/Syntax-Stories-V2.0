import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/web_config.dart';
import '../theme/app_color_tokens.dart';
import 'paragraph_doc.dart';

Future<void> openParagraphMentionProfile(
  BuildContext context,
  ParagraphMention mention,
) async {
  final username = mention.username.trim();
  if (username.isEmpty) return;
  final url = '${resolveWebBaseUrl()}/u/${Uri.encodeComponent(username)}';
  final uri = Uri.tryParse(url);
  if (uri == null) return;
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}

Future<void> openParagraphGifSource(ParagraphGif gif) async {
  final url = gif.sourceUrl.trim();
  if (url.isEmpty) return;
  final uri = Uri.tryParse(url);
  if (uri == null) return;
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}

Rect? paragraphGifAnchorRect(BuildContext context) {
  final box = context.findRenderObject();
  if (box is! RenderBox || !box.hasSize) return null;
  return box.localToGlobal(Offset.zero) & box.size;
}

Offset _computeGifPopoverOffset({
  required Rect anchor,
  required Size popoverSize,
  required Size screen,
}) {
  const gap = 8.0;
  const pad = 8.0;

  var left = anchor.center.dx - popoverSize.width / 2;
  var top = anchor.bottom + gap;

  if (top + popoverSize.height > screen.height - pad) {
    top = anchor.top - popoverSize.height - gap;
  }

  left = left.clamp(pad, math.max(pad, screen.width - popoverSize.width - pad));
  top = top.clamp(pad, math.max(pad, screen.height - popoverSize.height - pad));
  return Offset(left, top);
}

void showParagraphGifPopover(
  BuildContext context,
  ParagraphGif gif, {
  required Rect anchorRect,
}) {
  if (gif.url.trim().isEmpty) return;

  final overlay = Overlay.of(context, rootOverlay: true);
  late OverlayEntry entry;

  void removeEntry() {
    entry.remove();
  }

  entry = OverlayEntry(
    builder: (overlayContext) {
      final screen = MediaQuery.sizeOf(overlayContext);
      final colors = overlayContext.appColors;
      final primary = Theme.of(overlayContext).colorScheme.primary;
      const maxPopoverSide = 180.0;
      final side = math.min(
        maxPopoverSide,
        math.min(screen.width * 0.48, screen.height * 0.28),
      );
      final popoverSize = Size(side, side);
      final position = _computeGifPopoverOffset(
        anchor: anchorRect,
        popoverSize: popoverSize,
        screen: screen,
      );

      return Stack(
        children: [
          Positioned.fill(
            child: GestureDetector(
              onTap: removeEntry,
              behavior: HitTestBehavior.translucent,
            ),
          ),
          Positioned(
            left: position.dx,
            top: position.dy,
            child: Material(
              elevation: 12,
              color: colors.card,
              child: GestureDetector(
                onTap: () async {
                  await openParagraphGifSource(gif);
                },
                child: Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: colors.border, width: 2),
                  ),
                  width: side,
                  height: side,
                  child: ClipRRect(
                    child: Image.network(
                      gif.url,
                      width: side,
                      height: side,
                      fit: BoxFit.cover,
                      gaplessPlayback: true,
                      filterQuality: FilterQuality.low,
                      errorBuilder: (_, _, _) => Icon(
                        Icons.gif_box_outlined,
                        size: 40,
                        color: primary,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      );
    },
  );

  overlay.insert(entry);
}

class ParagraphInlineGifThumb extends StatelessWidget {
  const ParagraphInlineGifThumb({
    super.key,
    required this.gif,
    required this.size,
    required this.colors,
  });

  final ParagraphGif gif;
  final double size;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final url = gif.url.trim();
    return Padding(
      padding: const EdgeInsets.only(right: 4),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: url.isEmpty
              ? null
              : () {
                  final anchor = paragraphGifAnchorRect(context);
                  if (anchor == null) return;
                  showParagraphGifPopover(context, gif, anchorRect: anchor);
                },
          borderRadius: BorderRadius.circular(3),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: SizedBox(
              width: size,
              height: size,
              child: url.isEmpty
                  ? ColoredBox(
                      color: colors.muted.withValues(alpha: 0.25),
                      child: Icon(
                        Icons.gif_box_outlined,
                        size: size * 0.85,
                        color: colors.primary,
                      ),
                    )
                  : Image.network(
                      url,
                      width: size,
                      height: size,
                      fit: BoxFit.cover,
                      gaplessPlayback: true,
                      filterQuality: FilterQuality.low,
                      errorBuilder: (_, _, _) => ColoredBox(
                        color: colors.muted.withValues(alpha: 0.25),
                        child: Icon(
                          Icons.gif_box_outlined,
                          size: size * 0.85,
                          color: colors.primary,
                        ),
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}
