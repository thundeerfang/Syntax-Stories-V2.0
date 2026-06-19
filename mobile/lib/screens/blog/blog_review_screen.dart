import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/blog_post.dart';
import '../../models/blog_taxonomy.dart';
import '../../models/blog_write_draft.dart';
import '../../services/api_errors.dart';
import '../../services/auth_api.dart';
import '../../services/blog_api.dart';
import '../../services/upload_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/blog_content_serializer.dart';
import '../../utils/blog_taxonomy_utils.dart';
import '../../utils/gallery_image_picker.dart';
import '../../utils/resolve_profile_media_url.dart';
import '../../utils/user_message_case.dart';
import '../../widgets/auth/auth_button.dart';
import '../../widgets/auth/auth_text_field.dart';
import '../../widgets/navigation/screen_app_bar.dart';
import '../../widgets/ui/app_feedback_toast.dart';
import '../../widgets/ui/dashed_border_box.dart';
import '../../widgets/ui/unfocus_tap_region.dart';
import 'blog_publish_result_screen.dart';

class BlogReviewScreen extends StatefulWidget {
  const BlogReviewScreen({super.key, required this.draft});

  final BlogWriteDraft draft;

  @override
  State<BlogReviewScreen> createState() => _BlogReviewScreenState();
}

class _BlogReviewScreenState extends State<BlogReviewScreen> {
  static const _categoryPageSize = 6;

  final _blogApi = BlogApi();
  final _uploadApi = UploadApi();
  final _tagInput = TextEditingController();
  final _categorySearch = TextEditingController();

  BlogTaxonomyCatalog _taxonomy = const BlogTaxonomyCatalog();
  var _loadingTaxonomy = true;
  final List<String> _categories = [];
  final Map<String, String> _categoryLabels = {};
  var _categoryPage = 0;
  var _categoryPageWindowStart = 0;
  final List<String> _tags = [];
  bool _submitting = false;
  String? _submitAction;
  Uint8List? _coverBytes;
  String? _coverFileName;
  String? _coverUrl;

  bool get _isEditing => widget.draft.isEditing;

  @override
  void initState() {
    super.initState();
    _coverBytes = widget.draft.thumbnailBytes;
    _coverFileName = widget.draft.thumbnailFileName;
    _coverUrl = widget.draft.thumbnailUrl;
    _categories.addAll(widget.draft.categories);
    _tags.addAll(widget.draft.tags);
    _categorySearch.addListener(_onCategorySearchChanged);
    _loadTaxonomy();
  }

  @override
  void dispose() {
    _tagInput.dispose();
    _categorySearch.dispose();
    super.dispose();
  }

  List<BlogTaxonomyRow> get _filteredCategoryRows {
    final q = _categorySearch.text.trim().toLowerCase();
    if (q.isEmpty) return _taxonomy.categories;
    return _taxonomy.categories
        .where(
          (row) =>
              row.name.toLowerCase().contains(q) ||
              row.slug.toLowerCase().contains(q),
        )
        .toList();
  }

  List<BlogTaxonomyRow> get _pagedCategoryRows {
    final filtered = _filteredCategoryRows;
    final start = _categoryPage * _categoryPageSize;
    if (start >= filtered.length) return const [];
    final end = math.min(start + _categoryPageSize, filtered.length);
    return filtered.sublist(start, end);
  }

  Future<void> _loadTaxonomy() async {
    setState(() => _loadingTaxonomy = true);
    try {
      final catalog = await _blogApi.fetchTaxonomy();
      if (!mounted) return;
      setState(() {
        _taxonomy = catalog;
        for (final row in catalog.categories) {
          if (_categories.contains(row.slug)) {
            _categoryLabels[row.slug] = row.name;
          }
        }
        _loadingTaxonomy = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadingTaxonomy = false);
      AppFeedbackToast.error(
        context,
        formatUserMessage(
          e is AuthApiException ? e.message : kGenericUserError,
        ),
      );
    }
  }

  void _onCategorySearchChanged() {
    setState(() {
      _categoryPage = 0;
      _categoryPageWindowStart = 0;
    });
  }

  int get _categoryPageCount {
    final total = _filteredCategoryRows.length;
    if (total <= 0) return 0;
    return (total / _categoryPageSize).ceil();
  }

  void _setCategoryPage(int page) {
    if (page < 0 || page >= _categoryPageCount || page == _categoryPage) return;
    setState(() {
      _categoryPage = page;
      _syncCategoryPageWindow(page);
    });
  }

  void _syncCategoryPageWindow(int page) {
    final count = _categoryPageCount;
    if (count <= 4) {
      _categoryPageWindowStart = 0;
      return;
    }
    final maxStart = count - 4;
    if (page < _categoryPageWindowStart) {
      _categoryPageWindowStart = page;
    } else if (page >= _categoryPageWindowStart + 4) {
      _categoryPageWindowStart = math.min(page - 3, maxStart);
    }
    _categoryPageWindowStart = _categoryPageWindowStart.clamp(0, maxStart);
  }

  void _shiftCategoryPageWindow(int delta) {
    final count = _categoryPageCount;
    if (count <= 4) return;
    final maxStart = count - 4;
    setState(() {
      _categoryPageWindowStart = (_categoryPageWindowStart + delta).clamp(
        0,
        maxStart,
      );
    });
  }

  void _toggleCategory(BlogTaxonomyRow row) {
    final next = toggleBlogCategory(_categories, row.slug);
    if (next.length == _categories.length) {
      if (!_categories.contains(row.slug)) {
        AppFeedbackToast.error(
          context,
          'You can pick up to $blogMaxCategories categories.',
        );
      }
      return;
    }
    setState(() {
      _categories
        ..clear()
        ..addAll(next);
      if (next.contains(row.slug)) {
        _categoryLabels[row.slug] = row.name;
      } else {
        _categoryLabels.remove(row.slug);
      }
    });
  }

  void _removeCategory(String slug) {
    setState(() {
      _categories.remove(slug);
      _categoryLabels.remove(slug);
    });
  }

  void _addTagFromInput() {
    final next = addBlogTag(_tags, _tagInput.text);
    if (next.length == _tags.length) {
      AppFeedbackToast.error(context, 'Could not add that tag.');
      return;
    }
    setState(() {
      _tags
        ..clear()
        ..addAll(next);
      _tagInput.clear();
    });
  }

  void _addSuggestedTag(String slug) {
    final next = addBlogTag(_tags, slug);
    if (next.length == _tags.length) return;
    setState(() {
      _tags
        ..clear()
        ..addAll(next);
    });
  }

  void _removeTag(String tag) {
    setState(() => _tags.remove(tag));
  }

  String _tagDisplayLabel(String slug) {
    for (final row in _taxonomy.tags) {
      if (row.slug == slug) return row.name;
    }
    return slug;
  }

  Future<void> _pickCover() async {
    final result = await pickGalleryImageBytes();
    if (!mounted) return;
    if (result.cancelled) return;
    if (result.error != null) {
      AppFeedbackToast.error(context, formatUserMessage(result.error!));
      return;
    }
    setState(() {
      _coverBytes = result.bytes;
      _coverFileName = result.fileName ?? 'cover.jpg';
      _coverUrl = null;
    });
  }

  void _removeCover() {
    setState(() {
      _coverBytes = null;
      _coverFileName = null;
      _coverUrl = null;
    });
  }

  Future<String?> _resolveThumbnailUrl(String token) async {
    if (_coverUrl != null && _coverUrl!.trim().isNotEmpty) {
      return _coverUrl!.trim();
    }
    final bytes = _coverBytes;
    if (bytes == null || bytes.isEmpty) return null;
    final result = await _uploadApi.uploadCover(
      accessToken: token,
      bytes: bytes,
      filename: _coverFileName ?? 'cover.jpg',
    );
    return result.url;
  }

  Future<void> _submit({required bool publish}) async {
    if (_submitting) return;

    final blockError = validateBlogBlocksForPublish(widget.draft.blocks);
    if (blockError != null) {
      AppFeedbackToast.error(context, blockError);
      return;
    }

    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      AppFeedbackToast.error(context, 'Not signed in.');
      return;
    }

    if (_categories.length > blogMaxCategories) {
      AppFeedbackToast.error(
        context,
        'Pick at most $blogMaxCategories categories.',
      );
      return;
    }

    setState(() {
      _submitting = true;
      _submitAction = publish ? 'publish' : 'draft';
    });

    try {
      final thumbnailUrl = await _resolveThumbnailUrl(token);
      final thumbnailForSubmit = _isEditing
          ? (thumbnailUrl ?? '')
          : thumbnailUrl;
      final readyBlocks = await prepareBlogBlocksForSubmit(
        widget.draft.blocks,
        accessToken: token,
        uploadApi: _uploadApi,
      );
      final content = serializeBlogBlocks(readyBlocks);
      final summary = widget.draft.summary.trim().isEmpty
          ? null
          : widget.draft.summary.trim();
      final categories = _categories.isEmpty
          ? null
          : List<String>.from(_categories);
      final tags = _tags.isEmpty ? null : List<String>.from(_tags);

      final BlogPost post;
      final status = publish ? 'published' : 'draft';
      if (_isEditing) {
        post = await _blogApi.updatePost(
          postId: widget.draft.editingPostId!,
          accessToken: token,
          title: widget.draft.title,
          content: content,
          summary: summary,
          thumbnailUrl: thumbnailForSubmit,
          status: status,
          categories: categories,
          tags: tags,
        );
      } else {
        post = await _blogApi.createPost(
          accessToken: token,
          title: widget.draft.title,
          content: content,
          summary: summary,
          thumbnailUrl: thumbnailForSubmit,
          status: status,
          categories: categories,
          tags: tags,
        );
      }

      if (!mounted) return;
      Navigator.of(context).pushReplacement<void, void>(
        MaterialPageRoute<void>(
          builder: (_) => BlogPublishResultScreen(post: post),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(
        context,
        formatUserMessage(
          e is AuthApiException ? e.message : kGenericUserError,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
          _submitAction = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final coverUrl = _coverUrl != null
        ? resolveProfileMediaUrl(_coverUrl)
        : null;
    final hasCover =
        _coverBytes != null || (coverUrl != null && coverUrl.isNotEmpty);

    return UnfocusTapRegion(
      child: Scaffold(
        backgroundColor: colors.background,
        appBar: ScreenAppBar(
          title: _isEditing ? 'Review Changes' : 'Review Post',
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          children: [
            Text(
              _isEditing ? 'Review your changes' : 'Classify & publish',
              style: GoogleFonts.inter(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: colors.foreground,
                height: 1.2,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              _isEditing
                  ? 'Confirm cover, category, and tags before updating this post.'
                  : 'Add an optional cover, then pick a category and tags before saving.',
              style: GoogleFonts.inter(
                fontSize: 13,
                color: colors.mutedForeground,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 20),
            _SectionLabel(label: 'Cover image'),
            const SizedBox(height: 10),
            if (_coverBytes != null)
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: AspectRatio(
                      aspectRatio: 4,
                      child: Image.memory(_coverBytes!, fit: BoxFit.cover),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: IconButton.filled(
                      style: IconButton.styleFrom(
                        backgroundColor: colors.background.withValues(
                          alpha: 0.92,
                        ),
                        foregroundColor: colors.foreground,
                      ),
                      onPressed: _removeCover,
                      icon: const Icon(Icons.close_rounded, size: 18),
                    ),
                  ),
                ],
              )
            else if (coverUrl != null && coverUrl.isNotEmpty)
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: AspectRatio(
                      aspectRatio: 4,
                      child: Image.network(coverUrl, fit: BoxFit.cover),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: IconButton.filled(
                      style: IconButton.styleFrom(
                        backgroundColor: colors.background.withValues(
                          alpha: 0.92,
                        ),
                        foregroundColor: colors.foreground,
                      ),
                      onPressed: _removeCover,
                      icon: const Icon(Icons.close_rounded, size: 18),
                    ),
                  ),
                ],
              )
            else
              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: _pickCover,
                  borderRadius: BorderRadius.circular(4),
                  child: DashedBorderBox(
                    padding: const EdgeInsets.symmetric(
                      vertical: 28,
                      horizontal: 16,
                    ),
                    color: colors.border,
                    child: Column(
                      children: [
                        Icon(
                          Icons.image_outlined,
                          size: 28,
                          color: colors.mutedForeground,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Add cover (optional)',
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: colors.foreground,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '4∶1 crop recommended',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            color: colors.mutedForeground,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            if (hasCover) ...[
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: _pickCover,
                  icon: const Icon(Icons.swap_horiz_rounded, size: 18),
                  label: const Text('Change cover'),
                ),
              ),
            ],
            const SizedBox(height: 24),
            _SectionLabel(label: 'Category (max $blogMaxCategories)'),
            const SizedBox(height: 10),
            if (_categories.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final slug in _categories)
                      InputChip(
                        label: Text(
                          _categoryLabels[slug] ?? slug,
                          style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.zero,
                          side: BorderSide(color: colors.border, width: 1.5),
                        ),
                        onDeleted: () => _removeCategory(slug),
                        deleteIconColor: colors.mutedForeground,
                      ),
                  ],
                ),
              ),
            TextField(
              controller: _categorySearch,
              decoration: const InputDecoration(
                hintText: 'Search categories…',
                prefixIcon: Icon(Icons.search, size: 20),
              ),
            ),
            const SizedBox(height: 10),
            if (_loadingTaxonomy)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: LinearProgressIndicator(
                  minHeight: 2,
                  color: colors.primary,
                  backgroundColor: colors.border,
                ),
              )
            else if (_taxonomy.categories.isEmpty)
              Text(
                'No categories available yet.',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: colors.mutedForeground,
                ),
              )
            else if (_pagedCategoryRows.isEmpty)
              Text(
                'No categories match your search.',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: colors.mutedForeground,
                ),
              )
            else
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final row in _pagedCategoryRows)
                    _ChoiceChip(
                      label: row.name,
                      selected: _categories.contains(row.slug),
                      onTap: () => _toggleCategory(row),
                    ),
                ],
              ),
            if (_categoryPageCount > 1) ...[
              const SizedBox(height: 10),
              _CategoryPaginationBar(
                pageCount: _categoryPageCount,
                currentPage: _categoryPage,
                windowStart: _categoryPageWindowStart,
                onPageSelected: _setCategoryPage,
                onWindowPrevious: () => _shiftCategoryPageWindow(-1),
                onWindowNext: () => _shiftCategoryPageWindow(1),
              ),
            ],
            const SizedBox(height: 24),
            _SectionLabel(label: 'Tags'),
            const SizedBox(height: 10),
            if (_tags.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final tag in _tags)
                      _TagChip(
                        label: _tagDisplayLabel(tag),
                        selected: true,
                        onDelete: () => _removeTag(tag),
                      ),
                  ],
                ),
              ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  child: AuthTextField(
                    controller: _tagInput,
                    label: 'Add tag',
                    hintText: 'Add tag',
                    showFieldLabel: false,
                    showCounter: false,
                  ),
                ),
                const SizedBox(width: 8),
                AuthButton(
                  label: 'Add',
                  expand: false,
                  onPressed: _addTagFromInput,
                ),
              ],
            ),
            if (_taxonomy.tags.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                'Suggested',
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: colors.mutedForeground,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final row in _taxonomy.tags.take(12))
                    if (!_tags.contains(row.slug))
                      _TagChip(
                        label: row.name,
                        selected: false,
                        onTap: () => _addSuggestedTag(row.slug),
                      ),
                ],
              ),
            ],
            const SizedBox(height: 28),
            AuthButton(
              label: _isEditing ? 'Update post' : 'Publish',
              loading: _submitting && _submitAction == 'publish',
              loadingLabel: _isEditing ? 'Updating…' : 'Publishing…',
              onPressed: _submitting ? null : () => _submit(publish: true),
            ),
            const SizedBox(height: 12),
            AuthButton(
              label: _isEditing ? 'Save as draft' : 'Save as draft',
              variant: AuthButtonVariant.secondary,
              loading: _submitting && _submitAction == 'draft',
              loadingLabel: 'Saving…',
              onPressed: _submitting ? null : () => _submit(publish: false),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label.toUpperCase(),
      style: GoogleFonts.inter(
        fontSize: 10,
        fontWeight: FontWeight.w900,
        letterSpacing: 1.2,
        color: context.appColors.mutedForeground,
      ),
    );
  }
}

class _CategoryPaginationBar extends StatelessWidget {
  const _CategoryPaginationBar({
    required this.pageCount,
    required this.currentPage,
    required this.windowStart,
    required this.onPageSelected,
    required this.onWindowPrevious,
    required this.onWindowNext,
  });

  static const _windowSize = 4;

  final int pageCount;
  final int currentPage;
  final int windowStart;
  final ValueChanged<int> onPageSelected;
  final VoidCallback onWindowPrevious;
  final VoidCallback onWindowNext;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final useArrows = pageCount > _windowSize;
    final maxStart = math.max(0, pageCount - _windowSize);
    final start = useArrows ? windowStart.clamp(0, maxStart) : 0;
    final windowEnd = math.min(start + _windowSize, pageCount);
    final windowPages = [for (var i = start; i < windowEnd; i++) i];
    final lastPage = pageCount - 1;
    final showLastSeparate = useArrows && !windowPages.contains(lastPage);

    return Row(
      children: [
        if (useArrows)
          _PaginationArrow(
            icon: Icons.chevron_left_rounded,
            enabled: start > 0,
            onTap: onWindowPrevious,
          ),
        Expanded(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 0; i < windowPages.length; i++) ...[
                if (i > 0) const SizedBox(width: 6),
                _PageChip(
                  label: '${windowPages[i] + 1}',
                  selected: currentPage == windowPages[i],
                  onTap: () => onPageSelected(windowPages[i]),
                ),
              ],
              if (showLastSeparate) ...[
                const SizedBox(width: 6),
                Text(
                  '…',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: colors.mutedForeground,
                  ),
                ),
                const SizedBox(width: 6),
                _PageChip(
                  label: '$pageCount',
                  selected: currentPage == lastPage,
                  onTap: () => onPageSelected(lastPage),
                ),
              ],
            ],
          ),
        ),
        if (useArrows)
          _PaginationArrow(
            icon: Icons.chevron_right_rounded,
            enabled: start < maxStart,
            onTap: onWindowNext,
          ),
      ],
    );
  }
}

class _PaginationArrow extends StatelessWidget {
  const _PaginationArrow({
    required this.icon,
    required this.enabled,
    required this.onTap,
  });

  final IconData icon;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Material(
      color: colors.card,
      borderRadius: BorderRadius.zero,
      child: InkWell(
        onTap: enabled ? onTap : null,
        child: Container(
          width: 36,
          height: 36,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            border: Border.all(
              color: enabled
                  ? colors.border
                  : colors.border.withValues(alpha: 0.45),
              width: 2,
            ),
          ),
          child: Icon(
            icon,
            size: 20,
            color: enabled ? colors.foreground : colors.mutedForeground,
          ),
        ),
      ),
    );
  }
}

class _PageChip extends StatelessWidget {
  const _PageChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Material(
      color: selected ? colors.primary : colors.card,
      borderRadius: BorderRadius.zero,
      child: InkWell(
        onTap: onTap,
        child: Container(
          width: 36,
          height: 36,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            border: Border.all(
              color: selected ? colors.primary : colors.border,
              width: 2,
            ),
          ),
          child: Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: selected ? colors.primaryForeground : colors.foreground,
            ),
          ),
        ),
      ),
    );
  }
}

class _TagChip extends StatelessWidget {
  const _TagChip({
    required this.label,
    required this.selected,
    this.onTap,
    this.onDelete,
  });

  static const _radius = 20.0;

  final String label;
  final bool selected;
  final VoidCallback? onTap;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final background = selected
        ? colors.primary.withValues(alpha: 0.12)
        : colors.card;
    final borderColor = selected ? colors.primary : colors.border;
    final textColor = selected ? colors.primary : colors.foreground;

    return Material(
      color: background,
      borderRadius: BorderRadius.circular(_radius),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(_radius),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(_radius),
            border: Border.all(color: borderColor, width: 1.5),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '#$label',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: textColor,
                ),
              ),
              if (onDelete != null) ...[
                const SizedBox(width: 6),
                InkWell(
                  onTap: onDelete,
                  borderRadius: BorderRadius.circular(12),
                  child: Icon(
                    Icons.close_rounded,
                    size: 16,
                    color: selected ? colors.primary : colors.mutedForeground,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _ChoiceChip extends StatelessWidget {
  const _ChoiceChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Material(
      color: selected ? colors.primary.withValues(alpha: 0.12) : colors.card,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: selected ? colors.primary : colors.border,
            ),
          ),
          child: Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: selected ? colors.primary : colors.foreground,
            ),
          ),
        ),
      ),
    );
  }
}
