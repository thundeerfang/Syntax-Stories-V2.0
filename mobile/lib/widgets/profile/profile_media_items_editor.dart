import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/image_upload_kind.dart';
import '../../models/profile_media_item.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/resolve_profile_media_url.dart';
import '../ui/dashed_border_box.dart';
import '../ui/image_upload_crop_dialog.dart';
import 'profile_media_link_dialog.dart';

/// Work media list — upload images or add links via dialog.
class ProfileMediaItemsEditor extends StatefulWidget {
  const ProfileMediaItemsEditor({
    super.key,
    required this.items,
    required this.maxItems,
    required this.onChanged,
    this.disabled = false,
  });

  final List<ProfileMediaItem> items;
  final int maxItems;
  final ValueChanged<List<ProfileMediaItem>> onChanged;
  final bool disabled;

  @override
  State<ProfileMediaItemsEditor> createState() => _ProfileMediaItemsEditorState();
}

class _ProfileMediaItemsEditorState extends State<ProfileMediaItemsEditor> {
  Future<void> _uploadMedia() async {
    if (widget.disabled || widget.items.length >= widget.maxItems) return;
    final result = await ImageUploadCropDialog.showAssetUpload(context, ImageUploadKind.workMedia);
    if (result == null || result.url.isEmpty || !mounted) return;
    widget.onChanged([...widget.items, ProfileMediaItem(url: result.url)]);
    setState(() {});
  }

  Future<void> _uploadLink() async {
    if (widget.disabled || widget.items.length >= widget.maxItems) return;
    final item = await ProfileMediaLinkDialog.show(context);
    if (item == null || !mounted) return;
    widget.onChanged([...widget.items, item]);
    setState(() {});
  }

  void _removeAt(int index) {
    final next = List<ProfileMediaItem>.from(widget.items)..removeAt(index);
    widget.onChanged(next);
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final atMax = widget.items.length >= widget.maxItems;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'MEDIA (${widget.items.length}/${widget.maxItems})',
          style: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
            color: colors.mutedForeground,
          ),
        ),
        const SizedBox(height: 8),
        for (var i = 0; i < widget.items.length; i++) ...[
          _MediaRow(item: widget.items[i], onRemove: widget.disabled ? null : () => _removeAt(i)),
          if (i < widget.items.length - 1) const SizedBox(height: 8),
        ],
        if (widget.items.isNotEmpty) const SizedBox(height: 12),
        if (!atMax) ...[
          _MediaUploadRow(
            icon: Icons.photo_library_outlined,
            label: 'UPLOAD IMAGE',
            onTap: widget.disabled ? null : _uploadMedia,
          ),
          const SizedBox(height: 10),
          _MediaUploadRow(
            icon: Icons.link_rounded,
            label: 'UPLOAD LINK',
            onTap: widget.disabled ? null : _uploadLink,
          ),
        ],
      ],
    );
  }
}

class _MediaUploadRow extends StatelessWidget {
  const _MediaUploadRow({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return DashedBorderBox(
      color: colors.border.withValues(alpha: 0.85),
      backgroundColor: colors.muted.withValues(alpha: 0.08),
      padding: const EdgeInsets.all(14),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          child: Row(
            children: [
              Icon(icon, color: colors.primary),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  label,
                  style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MediaRow extends StatelessWidget {
  const _MediaRow({required this.item, this.onRemove});

  final ProfileMediaItem item;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final preview = resolveProfileMediaUrl(item.url);
    final isImage = RegExp(r'\.(png|jpe?g|gif|webp|heic)(\?|$)', caseSensitive: false).hasMatch(preview);

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 2),
        color: colors.card,
      ),
      child: Row(
        children: [
          if (isImage)
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 1),
              ),
              clipBehavior: Clip.hardEdge,
              child: Image.network(preview, fit: BoxFit.cover),
            )
          else
            Icon(Icons.link_rounded, color: colors.primary, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  (item.title?.trim().isNotEmpty == true ? item.title! : item.url).toUpperCase(),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800),
                ),
              ],
            ),
          ),
          if (onRemove != null)
            IconButton(
              onPressed: onRemove,
              icon: Icon(Icons.close_rounded, size: 18, color: colors.mutedForeground),
            ),
        ],
      ),
    );
  }
}
