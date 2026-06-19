import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/blog_block.dart';
import '../../models/blog_write_draft.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/blog_block_factory.dart';
import '../../utils/blog_content_serializer.dart';
import '../../widgets/auth/auth_button.dart';
import '../../widgets/auth/auth_text_field.dart';
import '../../widgets/blog_write/blog_write_block_list.dart';
import '../../widgets/blog_write/blog_write_orbit_fab.dart';
import '../../widgets/ui/app_feedback_toast.dart';
import '../../widgets/navigation/screen_app_bar.dart';
import '../../widgets/ui/unfocus_tap_region.dart';
import 'blog_review_screen.dart';

class BlogCreateScreen extends StatefulWidget {
  const BlogCreateScreen({super.key, this.initialDraft});

  final BlogWriteDraft? initialDraft;

  @override
  State<BlogCreateScreen> createState() => _BlogCreateScreenState();
}

class _BlogCreateScreenState extends State<BlogCreateScreen> {
  static const _titleMax = 300;

  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _summary = TextEditingController();

  List<BlogBlock> _blocks = [createBlogBlock(BlogBlockType.paragraph)];

  bool get _isEditing => widget.initialDraft?.isEditing == true;

  @override
  void initState() {
    super.initState();
    final draft = widget.initialDraft;
    if (draft == null) return;
    _title.text = draft.title;
    _summary.text = draft.summary;
    _blocks = draft.blocks.isEmpty
        ? [createBlogBlock(BlogBlockType.paragraph)]
        : List<BlogBlock>.from(draft.blocks);
  }

  @override
  void dispose() {
    _title.dispose();
    _summary.dispose();
    super.dispose();
  }

  void _addBlock(String type) {
    if (_blocks.length >= blogMaxBlocksPerSection) return;
    setState(() => _blocks = [..._blocks, createBlogBlock(type)]);
  }

  void _onBlocksChanged(List<BlogBlock> next) {
    setState(() => _blocks = next);
  }

  void _continueToReview() {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    if (!blogBlocksHaveContent(_blocks)) {
      AppFeedbackToast.error(
        context,
        'Add at least one content block before continuing.',
      );
      return;
    }

    final blockError = validateBlogBlocksForPublish(_blocks);
    if (blockError != null) {
      AppFeedbackToast.error(context, blockError);
      return;
    }

    final draft = BlogWriteDraft(
      title: _title.text.trim(),
      summary: _summary.text.trim(),
      blocks: List<BlogBlock>.from(_blocks),
      thumbnailUrl: widget.initialDraft?.thumbnailUrl,
      editingPostId: widget.initialDraft?.editingPostId,
      originalStatus: widget.initialDraft?.originalStatus,
      categories: widget.initialDraft?.categories ?? const [],
      tags: widget.initialDraft?.tags ?? const [],
    );

    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => BlogReviewScreen(draft: draft)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return UnfocusTapRegion(
      child: Scaffold(
        backgroundColor: colors.background,
        appBar: ScreenAppBar(title: _isEditing ? 'Edit Post' : 'New Post'),
        body: Stack(
          children: [
            Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
                children: [
                  Text(
                    _isEditing ? 'Edit Your Story' : 'Write Your Story',
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
                        ? 'Update your title, summary, and content blocks before reviewing changes.'
                        : 'Compose with the same block types as the web editor — paragraphs, code, images, video, tables, and more.',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: colors.mutedForeground,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 20),
                  AuthTextField(
                    controller: _title,
                    label: 'Title',
                    required: true,
                    maxLength: _titleMax,
                    textCapitalization: TextCapitalization.sentences,
                    validator: (value) {
                      final text = value?.trim() ?? '';
                      if (text.isEmpty) return 'Title is required.';
                      if (text.length > _titleMax) return 'Title is too long.';
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  AuthTextField(
                    controller: _summary,
                    label: 'Summary',
                    showFieldLabel: false,
                    hintText: 'Write a short summary…',
                    minLines: 3,
                    maxLines: 6,
                    textCapitalization: TextCapitalization.sentences,
                  ),
                  const SizedBox(height: 12),
                  BlogWriteBlockList(
                    blocks: _blocks,
                    onChanged: _onBlocksChanged,
                  ),
                  const SizedBox(height: 28),
                  AuthButton(
                    label: 'Continue to review',
                    onPressed: _continueToReview,
                  ),
                ],
              ),
            ),
            Positioned.fill(
              child: BlogWriteOrbitFab(
                blockCount: _blocks.length,
                onAddBlock: _addBlock,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
