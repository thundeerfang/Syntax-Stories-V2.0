import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/blog_block.dart';
import '../../services/unsplash_api.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/resolve_profile_media_url.dart';
import '../../utils/user_message_case.dart';
import '../auth/auth_button.dart';
import '../ui/dashed_border_box.dart';
import 'blog_image_layout_chips.dart';
import 'blog_image_layout_preview.dart';

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
    final layout = coerceBlogImageLayout(widget.block.payload['layout']?.toString());
    _layout = layout;
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

  bool get _canSearch => _query.text.trim().length > 3;

  @override
  void initState() {
    super.initState();
    _query = TextEditingController();
    _query.addListener(_onQueryChanged);
  }

  void _onQueryChanged() {
    setState(() {});
  }

  @override
  void dispose() {
    _query.removeListener(_onQueryChanged);
    _query.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final q = _query.text.trim();
    if (q.length <= 3) return;
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
                  onSubmitted: (_) {
                    if (_canSearch && !_loading) _search();
                  },
                ),
              ),
              const SizedBox(width: 8),
              AuthButton(
                label: _loading ? '…' : 'Go',
                expand: false,
                loading: _loading,
                onPressed: _canSearch && !_loading ? _search : null,
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
                ? const _UnsplashGridSkeleton()
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

class _UnsplashGridSkeleton extends StatefulWidget {
  const _UnsplashGridSkeleton();

  @override
  State<_UnsplashGridSkeleton> createState() => _UnsplashGridSkeletonState();
}

class _UnsplashGridSkeletonState extends State<_UnsplashGridSkeleton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return AnimatedBuilder(
      animation: _pulse,
      builder: (context, child) {
        final alpha = 0.22 + (_pulse.value * 0.18);
        return GridView.builder(
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            crossAxisSpacing: 6,
            mainAxisSpacing: 6,
          ),
          itemCount: 9,
          itemBuilder: (context, index) {
            return ColoredBox(
              color: colors.muted.withValues(alpha: alpha),
            );
          },
        );
      },
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BlogImageLayoutFrame(
          layout: layout,
          child: Stack(
            fit: StackFit.expand,
            children: [
              Image.network(
                resolved,
                width: double.infinity,
                height: double.infinity,
                fit: blogImageFitForLayout(layout),
                errorBuilder: (context, error, stackTrace) => Container(
                  color: colors.muted.withValues(alpha: 0.2),
                  child: Icon(Icons.broken_image_outlined, color: colors.mutedForeground),
                ),
              ),
              if (photographer.trim().isNotEmpty)
                Positioned(
                  left: 8,
                  bottom: 8,
                  right: 48,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: colors.background.withValues(alpha: 0.72),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                      child: Text(
                        photographer.trim(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: colors.foreground,
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        BlogImageLayoutChips(
          selected: layout,
          onSelected: onLayoutChanged,
        ),
        const SizedBox(height: 4),
        TextButton.icon(
          onPressed: onChangePhoto,
          icon: const Icon(Icons.upload_rounded, size: 18),
          label: Text(
            'Another Photo',
            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }
}
