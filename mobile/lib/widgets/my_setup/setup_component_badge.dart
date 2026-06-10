import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../models/setup_item.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/resolve_profile_media_url.dart';
import '../../utils/setup_url.dart';

/// Active setup component card — square image, title, product link, top-right actions.
class SetupComponentBadge extends StatelessWidget {
  const SetupComponentBadge({
    super.key,
    required this.item,
    required this.onRemove,
    this.onEdit,
    this.showActions = true,
  });

  final SetupItem item;
  final VoidCallback onRemove;
  final VoidCallback? onEdit;
  final bool showActions;

  static const _imageSize = 56.0;

  String? get _productUrl {
    final raw = item.productUrl?.trim();
    if (raw == null || raw.isEmpty) return null;
    return normalizeSetupUrl(raw);
  }

  String _linkLabel(String url) {
    final uri = Uri.tryParse(url);
    final host = uri?.host;
    if (host != null && host.isNotEmpty) return host;
    return url;
  }

  Future<void> _openProductLink(BuildContext context) async {
    final url = _productUrl;
    if (url == null) return;
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Could not open link.',
            style: GoogleFonts.inter(fontWeight: FontWeight.w600),
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final imageUrl = resolveProfileMediaUrl(item.imageUrl);
    final productUrl = _productUrl;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: colors.card,
        border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 2),
      ),
      child: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: _imageSize,
                  height: _imageSize,
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: colors.border.withValues(alpha: 0.85),
                      width: 2,
                    ),
                    color: colors.muted.withValues(alpha: 0.12),
                  ),
                  clipBehavior: Clip.hardEdge,
                  child: imageUrl.isEmpty
                      ? Icon(Icons.image_outlined, size: 22, color: colors.mutedForeground)
                      : Image.network(
                          imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Icon(
                            Icons.broken_image_outlined,
                            size: 22,
                            color: colors.mutedForeground,
                          ),
                        ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(top: 2, right: showActions ? 56 : 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.label.isEmpty ? 'Untitled' : item.label,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                            height: 1.25,
                            color: colors.foreground,
                          ),
                        ),
                        const SizedBox(height: 8),
                        if (productUrl != null)
                          InkWell(
                            onTap: () => _openProductLink(context),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.open_in_new_rounded,
                                  size: 14,
                                  color: colors.primary,
                                ),
                                const SizedBox(width: 4),
                                Flexible(
                                  child: Text(
                                    _linkLabel(productUrl),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.4,
                                      color: colors.primary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          )
                        else
                          Text(
                            'No product link',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.4,
                              color: colors.mutedForeground,
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (showActions)
            Positioned(
              top: 4,
              right: 4,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (onEdit != null)
                    _SetupCardIconButton(
                      icon: Icons.edit_outlined,
                      tooltip: 'Edit',
                      onTap: onEdit!,
                    ),
                  _SetupCardIconButton(
                    icon: Icons.close_rounded,
                    tooltip: 'Remove',
                    onTap: onRemove,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _SetupCardIconButton extends StatelessWidget {
  const _SetupCardIconButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Tooltip(
          message: tooltip,
          child: Padding(
            padding: const EdgeInsets.all(6),
            child: Icon(icon, size: 18, color: colors.mutedForeground),
          ),
        ),
      ),
    );
  }
}

/// Vertical list of active setup component cards.
class SetupComponentBadgeList extends StatelessWidget {
  const SetupComponentBadgeList({
    super.key,
    required this.items,
    required this.onRemoveAt,
    required this.onEditAt,
  });

  final List<SetupItem> items;
  final ValueChanged<int> onRemoveAt;
  final ValueChanged<int> onEditAt;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < items.length; i++) ...[
          SetupComponentBadge(
            item: items[i],
            onEdit: () => onEditAt(i),
            onRemove: () => onRemoveAt(i),
          ),
          if (i < items.length - 1) const SizedBox(height: 10),
        ],
      ],
    );
  }
}
