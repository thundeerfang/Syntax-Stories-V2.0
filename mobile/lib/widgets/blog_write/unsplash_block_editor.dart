import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/blog_block.dart';
import '../../services/unsplash_api.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/resolve_profile_media_url.dart';
import '../../utils/user_message_case.dart';
import '../ui/dashed_border_box.dart';

const _imageLayouts = ['landscape', 'square', 'fullWidth'];

/// Unsplash block — opens search sheet directly (no inline search field).
class UnsplashBlockEditor extends StatefulWidget {
  const UnsplashBlockEditor({
    super.key,
    required this.block,
    required this.onChanged,
  });

  final BlogBlock block;
  final ValueChanged<BlogBlock> onChanged;

  @override
  State<UnsplashBlockEditor> createState() => _UnsplashBlockEditorState();
}

class _UnsplashBlockEditorState extends State<UnsplashBlockEditor> {
  late String _layout;
  final _unsplashApi = UnsplashApi();
  var _sheetOpenedOnce = false;

  @override
  void initState() {
    super.initState();
    final layout = widget.block.payload['layout']?.toString() ?? 'landscape';
    _layout = _imageLayouts.contains(layout) ? layout : 'landscape';
    if (_selectedUrl == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _openSearchSheet(auto: true));
    }
  }

  @override
  void didUpdateWidget(covariant UnsplashBlockEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.block.id != widget.block.id) {
      _sheetOpenedOnce = false;
      if (_selectedUrl == null) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _openSearchSheet(auto: true));
      }
    }
  }

  String? get _selectedUrl {
    final url = widget.block.payload['url']?.toString().trim() ?? '';
    return url.isEmpty ? null : url;
  }

  Future<void> _openSearchSheet({bool auto = false}) async {
    if (auto) {
      if (_sheetOpenedOnce || !mounted || _selectedUrl != null) return;
      _sheetOpenedOnce = true;
    }

    final photo = await showModalBottomSheet<UnsplashPhoto?>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => _UnsplashSearchSheet(unsplashApi: _unsplashApi),
    );
    if (!mounted || photo == null) return;
    _applyPhoto(photo);
  }

  void _applyPhoto(UnsplashPhoto photo) {
    final payload = Map<String, dynamic>.from(widget.block.payload)
      ..['url'] = photo.regularUrl
      ..['photographer'] = photo.creditLabel
      ..['unsplashPhotoId'] = photo.id
      ..['layout'] = _layout;
    widget.onChanged(widget.block.copyWith(payload: payload, clearPendingImage: true));
  }

  void _setLayout(String layout) {
    setState(() => _layout = layout);
    final payload = Map<String, dynamic>.from(widget.block.payload)..['layout'] = layout;
    widget.onChanged(widget.block.copyWith(payload: payload));
  }

  @override
  Widget build(BuildContext context) {
    final selectedUrl = _selectedUrl;

    if (selectedUrl != null) {
      return _SelectedPhotoView(
        url: selectedUrl,
        photographer: widget.block.payload['photographer']?.toString() ?? '',
        layout: _layout,
        onChangePhoto: () => _openSearchSheet(),
        onLayoutChanged: _setLayout,
      );
    }

    return _EmptyUnsplashPrompt(onTap: () => _openSearchSheet());
  }
}

class _EmptyUnsplashPrompt extends StatelessWidget {
  const _EmptyUnsplashPrompt({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(4),
        child: DashedBorderBox(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
            child: Column(
              children: [
                Icon(Icons.photo_camera_outlined, size: 28, color: colors.mutedForeground),
                const SizedBox(height: 8),
                Text(
                  'Search Unsplash',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: colors.foreground,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Tap to browse photos',
                  style: GoogleFonts.inter(fontSize: 12, color: colors.mutedForeground),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _UnsplashSearchSheet extends StatefulWidget {
  const _UnsplashSearchSheet({required this.unsplashApi});

  final UnsplashApi unsplashApi;

  @override
  State<_UnsplashSearchSheet> createState() => _UnsplashSearchSheetState();
}

class _UnsplashSearchSheetState extends State<_UnsplashSearchSheet> {
  late final TextEditingController _query;
  var _loading = false;
  var _searched = false;
  String? _error;
  List<UnsplashPhoto> _results = const [];

  @override
  void initState() {
    super.initState();
    _query = TextEditingController();
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final q = _query.text.trim();
    if (q.isEmpty) return;
    setState(() {
      _loading = true;
      _error = null;
      _searched = true;
    });
    try {
      final results = await widget.unsplashApi.searchPhotos(q);
      if (!mounted) return;
      setState(() {
        _results = results;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = formatUserMessage(e.toString());
        _results = const [];
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final bottom = MediaQuery.viewInsetsOf(context).bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'UNSPLASH',
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
              color: colors.foreground,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _query,
                  autofocus: true,
                  textInputAction: TextInputAction.search,
                  decoration: const InputDecoration(
                    hintText: 'Search photos…',
                    prefixIcon: Icon(Icons.search, size: 20),
                  ),
                  onSubmitted: (_) => _search(),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: _loading || _query.text.trim().isEmpty ? null : _search,
                child: Text(_loading ? '…' : 'Go'),
              ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: GoogleFonts.inter(fontSize: 12, color: colors.destructive)),
          ],
          const SizedBox(height: 12),
          SizedBox(
            height: 220,
            child: _loading
                ? const Center(child: CircularProgressIndicator(strokeWidth: 2))
                : _results.isEmpty
                    ? Center(
                        child: Text(
                          _searched ? 'No results' : 'Search to preview',
                          style: GoogleFonts.inter(fontSize: 12, color: colors.mutedForeground),
                        ),
                      )
                    : GridView.builder(
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          crossAxisSpacing: 6,
                          mainAxisSpacing: 6,
                        ),
                        itemCount: _results.length,
                        itemBuilder: (context, index) {
                          final photo = _results[index];
                          return Material(
                            color: colors.muted.withValues(alpha: 0.2),
                            child: InkWell(
                              onTap: () => Navigator.pop(context, photo),
                              child: Image.network(
                                photo.thumbUrl,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) =>
                                    const Icon(Icons.broken_image_outlined),
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}

class _SelectedPhotoView extends StatelessWidget {
  const _SelectedPhotoView({
    required this.url,
    required this.photographer,
    required this.layout,
    required this.onChangePhoto,
    required this.onLayoutChanged,
  });

  final String url;
  final String photographer;
  final String layout;
  final VoidCallback onChangePhoto;
  final ValueChanged<String> onLayoutChanged;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final resolved = resolveProfileMediaUrl(url);
    final aspect = switch (layout) {
      'square' => 1.0,
      'fullWidth' => 9 / 16,
      _ => 16 / 9,
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AspectRatio(
          aspectRatio: aspect,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: Image.network(
              resolved,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => Container(
                color: colors.muted.withValues(alpha: 0.2),
                child: Icon(Icons.broken_image_outlined, color: colors.mutedForeground),
              ),
            ),
          ),
        ),
        if (photographer.trim().isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(
            photographer.trim(),
            style: GoogleFonts.inter(fontSize: 11, color: colors.mutedForeground),
          ),
        ],
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            for (final value in _imageLayouts)
              ChoiceChip(
                label: Text(value),
                selected: layout == value,
                onSelected: (_) => onLayoutChanged(value),
              ),
          ],
        ),
        const SizedBox(height: 4),
        TextButton(onPressed: onChangePhoto, child: const Text('Search another photo')),
      ],
    );
  }
}
