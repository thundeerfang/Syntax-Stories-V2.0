import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/app_feedback.dart';
import '../../models/blog_block.dart';
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
import '../../widgets/blog_write/blog_blocks_preview.dart';
import '../../widgets/ui/app_feedback_banner.dart';
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
  final _blogApi = BlogApi();
  final _uploadApi = UploadApi();
  final _tagInput = TextEditingController();
  final _customCategory = TextEditingController();

  BlogTaxonomyCatalog _taxonomy = const BlogTaxonomyCatalog();
  bool _loadingTaxonomy = true;
  String? _category;
  final List<String> _tags = [];
  String? _feedback;
  AppFeedbackKind _feedbackKind = AppFeedbackKind.error;
  bool _submitting = false;
  String? _submitAction;
  Uint8List? _coverBytes;
  String? _coverFileName;
  String? _coverUrl;

  @override
  void initState() {
    super.initState();
    _coverBytes = widget.draft.thumbnailBytes;
    _coverFileName = widget.draft.thumbnailFileName;
    _coverUrl = widget.draft.thumbnailUrl;
    _loadTaxonomy();
  }

  @override
  void dispose() {
    _tagInput.dispose();
    _customCategory.dispose();
    super.dispose();
  }

  void _setFeedback(String? message, {AppFeedbackKind kind = AppFeedbackKind.error}) {
    setState(() {
      _feedback = message;
      _feedbackKind = kind;
    });
  }

  Future<void> _loadTaxonomy() async {
    try {
      final catalog = await _blogApi.fetchTaxonomy();
      if (!mounted) return;
      setState(() {
        _taxonomy = catalog;
        _loadingTaxonomy = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadingTaxonomy = false);
      _setFeedback(
        formatUserMessage(e is AuthApiException ? e.message : kGenericUserError),
      );
    }
  }

  void _selectCategory(String slug) {
    setState(() {
      _category = slug;
      _customCategory.text = slug;
    });
  }

  void _addTagFromInput() {
    final next = addBlogTag(_tags, _tagInput.text);
    if (next.length == _tags.length) {
      _setFeedback('Could not add that tag.');
      return;
    }
    setState(() {
      _tags
        ..clear()
        ..addAll(next);
      _tagInput.clear();
    });
    _setFeedback(null);
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

  Future<void> _pickCover() async {
    _setFeedback(null);
    final result = await pickGalleryImageBytes();
    if (!mounted) return;
    if (result.cancelled) return;
    if (result.error != null) {
      _setFeedback(formatUserMessage(result.error!));
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
    _setFeedback(null);

    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      _setFeedback('Not signed in.');
      return;
    }

    setState(() {
      _submitting = true;
      _submitAction = publish ? 'publish' : 'draft';
    });

    try {
      final thumbnailUrl = await _resolveThumbnailUrl(token);
      final readyBlocks = await prepareBlogBlocksForSubmit(
        widget.draft.blocks,
        accessToken: token,
        uploadApi: _uploadApi,
      );
      final content = serializeBlogBlocks(readyBlocks);
      final summary = widget.draft.summary.trim().isEmpty ? null : widget.draft.summary.trim();
      final category = _category?.trim().isEmpty ?? true ? null : _category;
      final tags = _tags.isEmpty ? null : List<String>.from(_tags);

      final BlogPost post;
      if (publish) {
        post = await _blogApi.createPost(
          accessToken: token,
          title: widget.draft.title,
          content: content,
          summary: summary,
          thumbnailUrl: thumbnailUrl,
          status: 'published',
          category: category,
          tags: tags,
        );
      } else {
        post = await _blogApi.createPost(
          accessToken: token,
          title: widget.draft.title,
          content: content,
          summary: summary,
          thumbnailUrl: thumbnailUrl,
          status: 'draft',
          category: category,
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
      _setFeedback(formatUserMessage(e is AuthApiException ? e.message : kGenericUserError));
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
    final draft = widget.draft;
    final coverUrl = _coverUrl != null ? resolveProfileMediaUrl(_coverUrl) : null;
    final hasCover = _coverBytes != null || (coverUrl != null && coverUrl.isNotEmpty);

    return UnfocusTapRegion(
      child: Scaffold(
        backgroundColor: colors.background,
        appBar: AppBar(
          backgroundColor: colors.background,
          foregroundColor: colors.foreground,
          elevation: 0,
          scrolledUnderElevation: 0,
          title: Text(
            'REVIEW POST',
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w900,
              letterSpacing: 1,
            ),
          ),
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          children: [
            Text(
              'Preview & classify',
              style: GoogleFonts.inter(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: colors.foreground,
                height: 1.2,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Check your preview, add an optional cover, then pick a category and tags before saving.',
              style: GoogleFonts.inter(
                fontSize: 13,
                color: colors.mutedForeground,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 20),
            AppFeedbackSlot(message: _feedback, kind: _feedbackKind),
            _PreviewCard(
              title: draft.title,
              summary: draft.summary,
              blocks: draft.blocks,
              coverBytes: _coverBytes,
              coverUrl: hasCover ? coverUrl : null,
            ),
            const SizedBox(height: 24),
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
                        backgroundColor: colors.background.withValues(alpha: 0.92),
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
                        backgroundColor: colors.background.withValues(alpha: 0.92),
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
                    padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
                    color: colors.border,
                    child: Column(
                      children: [
                        Icon(Icons.image_outlined, size: 28, color: colors.mutedForeground),
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
            _SectionLabel(label: 'Category'),
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
                'No categories yet — type one below.',
                style: GoogleFonts.inter(fontSize: 12, color: colors.mutedForeground),
              )
            else
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final row in _taxonomy.categories)
                    _ChoiceChip(
                      label: row.name,
                      selected: _category == row.slug,
                      onTap: () => _selectCategory(row.slug),
                    ),
                ],
              ),
            const SizedBox(height: 12),
            AuthTextField(
              controller: _customCategory,
              label: 'Custom category',
              hintText: 'e.g. web-development',
              showCounter: false,
              onChanged: (value) {
                final slug = normalizeBlogCategory(value);
                setState(() => _category = slug.isEmpty ? null : slug);
              },
            ),
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
                      InputChip(
                        label: Text(tag),
                        onDeleted: () => _removeTag(tag),
                        deleteIconColor: colors.mutedForeground,
                      ),
                  ],
                ),
              ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: AuthTextField(
                    controller: _tagInput,
                    label: 'Add tag',
                    hintText: 'Press add or return',
                    showCounter: false,
                    onChanged: (_) => _setFeedback(null),
                  ),
                ),
                const SizedBox(width: 8),
                Padding(
                  padding: const EdgeInsets.only(top: 28),
                  child: AuthButton(
                    label: 'Add',
                    expand: false,
                    variant: AuthButtonVariant.secondary,
                    onPressed: _addTagFromInput,
                  ),
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
                      ActionChip(
                        label: Text(row.name),
                        onPressed: () => _addSuggestedTag(row.slug),
                      ),
                ],
              ),
            ],
            const SizedBox(height: 28),
            AuthButton(
              label: 'Publish',
              loading: _submitting && _submitAction == 'publish',
              loadingLabel: 'Publishing…',
              onPressed: _submitting ? null : () => _submit(publish: true),
            ),
            const SizedBox(height: 12),
            AuthButton(
              label: 'Save as draft',
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
            border: Border.all(color: selected ? colors.primary : colors.border),
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

class _PreviewCard extends StatelessWidget {
  const _PreviewCard({
    required this.title,
    required this.summary,
    required this.blocks,
    this.coverBytes,
    this.coverUrl,
  });

  final String title;
  final String summary;
  final List<BlogBlock> blocks;
  final Uint8List? coverBytes;
  final String? coverUrl;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: colors.card,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: colors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (coverBytes != null)
            AspectRatio(
              aspectRatio: 4,
              child: Image.memory(coverBytes!, fit: BoxFit.cover),
            )
          else if (coverUrl != null && coverUrl!.isNotEmpty)
            AspectRatio(
              aspectRatio: 4,
              child: Image.network(coverUrl!, fit: BoxFit.cover),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.inter(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: colors.foreground,
                    height: 1.25,
                  ),
                ),
                if (summary.trim().isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    summary.trim(),
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: colors.mutedForeground,
                      height: 1.4,
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                BlogBlocksPreview(blocks: blocks),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
