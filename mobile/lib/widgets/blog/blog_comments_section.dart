import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../controllers/blog_comment_thread.dart';
import '../../models/app_feedback.dart';
import '../../models/blog_comment.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/blog_card_format.dart';
import '../../utils/blog_comment_format.dart';
import '../../utils/resolve_profile_media_url.dart';
import '../blog_write/paragraph_rich_preview.dart';
import '../blog_write/rich_paragraph_editor.dart';
import '../ui/app_feedback_banner.dart';
import '../ui/app_loading_indicator.dart';
import '../ui/dashed_border_box.dart';

bool commentIsOwnedByViewer({
  required BlogComment comment,
  String? viewerUserId,
  String? viewerUsername,
}) {
  final authorId = comment.authorUserId ?? '';
  if (viewerUserId != null &&
      viewerUserId.isNotEmpty &&
      authorId.isNotEmpty &&
      viewerUserId == authorId) {
    return true;
  }
  final viewer = viewerUsername?.trim().toLowerCase() ?? '';
  final author = comment.author.username.trim().toLowerCase();
  return viewer.isNotEmpty && author.isNotEmpty && viewer == author;
}

class BlogCommentsSection extends StatefulWidget {
  const BlogCommentsSection({
    super.key,
    required this.thread,
    required this.composerKey,
    required this.onSubmit,
    this.submitting = false,
    this.fallbackCommentCount = 0,
    this.viewerUserId,
    this.viewerUsername,
    this.isSignedIn = false,
    this.onRequireAuth,
    this.onLike,
    this.onDelete,
    this.onUpdate,
  });

  final BlogCommentThreadController thread;
  final GlobalKey composerKey;
  final Future<void> Function(String text, {String? parentId}) onSubmit;
  final bool submitting;
  final int fallbackCommentCount;
  final String? viewerUserId;
  final String? viewerUsername;
  final bool isSignedIn;
  final VoidCallback? onRequireAuth;
  final Future<void> Function(BlogComment comment)? onLike;
  final Future<void> Function(BlogComment comment)? onDelete;
  final Future<void> Function(BlogComment comment, String text)? onUpdate;

  @override
  State<BlogCommentsSection> createState() => _BlogCommentsSectionState();
}

class _BlogCommentsSectionState extends State<BlogCommentsSection> {
  Map<String, dynamic> _draftPayload = emptyCommentParagraphPayload();
  int _composerVersion = 0;
  String? _replyParentId;
  String? _editingId;
  Map<String, dynamic>? _editPayload;
  bool _editSaving = false;
  String? _composerFeedback;

  void _clearComposerFeedback() {
    if (_composerFeedback != null) {
      setState(() => _composerFeedback = null);
    }
  }

  @override
  void initState() {
    super.initState();
    widget.thread.addListener(_onThreadChanged);
  }

  @override
  void didUpdateWidget(covariant BlogCommentsSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.thread != widget.thread) {
      oldWidget.thread.removeListener(_onThreadChanged);
      widget.thread.addListener(_onThreadChanged);
    }
  }

  @override
  void dispose() {
    widget.thread.removeListener(_onThreadChanged);
    super.dispose();
  }

  void _onThreadChanged() {
    if (mounted) setState(() {});
  }

  BlogComment? _commentById(String? id) => widget.thread.commentById(id);

  void _scrollToComposer() {
    final ctx = widget.composerKey.currentContext;
    if (ctx == null) return;
    Scrollable.ensureVisible(
      ctx,
      duration: const Duration(milliseconds: 350),
      curve: Curves.easeOutCubic,
      alignment: 0.35,
    );
  }

  void _startReply(BlogComment comment) {
    if (!widget.isSignedIn) {
      widget.onRequireAuth?.call();
      return;
    }
    setState(() {
      _replyParentId = comment.id;
      _editingId = null;
      _editPayload = null;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToComposer());
  }

  void _cancelReply() => setState(() => _replyParentId = null);

  void _startEdit(BlogComment comment) {
    setState(() {
      _editingId = comment.id;
      _editPayload = paragraphPayloadFromCommentText(comment.text);
      _replyParentId = null;
    });
  }

  void _cancelEdit() {
    setState(() {
      _editingId = null;
      _editPayload = null;
      _editSaving = false;
    });
  }

  Future<void> _saveEdit(BlogComment comment) async {
    final payload = _editPayload;
    if (payload == null || _editSaving || widget.onUpdate == null) return;
    if (!commentDraftIsSubmittable(payload)) return;

    final serialized = serializeCommentDraft(payload);
    if (serialized.isEmpty) return;

    setState(() => _editSaving = true);
    try {
      await widget.onUpdate!(comment, serialized);
      if (!mounted) return;
      _cancelEdit();
    } finally {
      if (mounted && _editSaving) {
        setState(() => _editSaving = false);
      }
    }
  }

  Future<void> _confirmDelete(BlogComment comment) async {
    final colors = context.appColors;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          'DELETE COMMENT',
          style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w900, letterSpacing: 0.6),
        ),
        content: Text(
          'This removes the comment and any replies. This cannot be undone.',
          style: GoogleFonts.inter(fontSize: 13, height: 1.45, color: colors.mutedForeground),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: colors.destructive),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted || widget.onDelete == null) return;
    await widget.onDelete!(comment);
  }

  Future<void> _submit() async {
    if (widget.submitting) return;
    final validationError = validateCommentDraft(_draftPayload);
    if (validationError != null) {
      setState(() => _composerFeedback = validationError);
      return;
    }
    final serialized = serializeCommentDraft(_draftPayload);
    if (serialized.isEmpty) return;

    final parentId = _replyParentId;
    setState(() => _composerFeedback = null);
    await widget.onSubmit(serialized, parentId: parentId);
    if (!mounted) return;
    setState(() {
      _draftPayload = emptyCommentParagraphPayload();
      _composerVersion++;
      _replyParentId = null;
      _composerFeedback = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final canSubmit = !widget.submitting;
    final replyTarget = _commentById(_replyParentId);
    final thread = widget.thread;
    final hasComments = thread.rootIds.isNotEmpty;
    final displayTotal = thread.postTotal > 0 ? thread.postTotal : widget.fallbackCommentCount;
    final loading = thread.rootsLoading;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Icon(Icons.forum_outlined, size: 18, color: primary),
            const SizedBox(width: 8),
            Text(
              'COMMENTS',
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.2,
                color: colors.foreground,
              ),
            ),
            if (loading && hasComments) ...[
              const SizedBox(width: 8),
              SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(strokeWidth: 2, color: primary),
              ),
            ],
            const Spacer(),
            Text(
              loading && !hasComments ? '…' : '$displayTotal',
              style: GoogleFonts.jetBrainsMono(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: colors.mutedForeground,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Container(
          key: widget.composerKey,
          decoration: BoxDecoration(
            border: Border.all(color: colors.border, width: 2),
            color: colors.card,
          ),
          padding: const EdgeInsets.fromLTRB(10, 8, 8, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (replyTarget != null) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                  decoration: BoxDecoration(
                    border: Border.all(color: primary.withValues(alpha: 0.45), width: 1.5),
                    color: primary.withValues(alpha: 0.08),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Replying to @${replyTarget.author.username}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: primary,
                          ),
                        ),
                      ),
                      InkWell(
                        onTap: _cancelReply,
                        child: Padding(
                          padding: const EdgeInsets.all(2),
                          child: Icon(Icons.close, size: 14, color: colors.mutedForeground),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
              ],
              AppFeedbackSlot(
                message: _composerFeedback,
                kind: AppFeedbackKind.error,
                onDismiss: _clearComposerFeedback,
              ),
              RichParagraphEditor(
                key: ValueKey(_composerVersion),
                payload: _draftPayload,
                minLines: 1,
                hintText: replyTarget != null
                    ? 'Write a reply… (max $kBlogCommentMaxWords words)'
                    : 'Add a comment… (max $kBlogCommentMaxWords words)',
                showInputBorder: false,
                onPayloadChanged: (next) => setState(() {
                  _draftPayload = next;
                  _composerFeedback = null;
                }),
                trailing: FilledButton(
                  onPressed: canSubmit ? _submit : null,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(72, 40),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                  ),
                  child: widget.submitting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'POST',
                              style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(width: 6),
                            const Icon(Icons.send_rounded, size: 16),
                          ],
                        ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (loading && !hasComments)
          Center(child: Padding(padding: const EdgeInsets.all(16), child: AppLoadingIndicator()))
        else if (!hasComments)
          const _CommentsEmptyState()
        else
          ...thread.rootIds.map(
            (rootId) {
              final comment = thread.commentById(rootId);
              if (comment == null) return const SizedBox.shrink();
              return _CommentThreadNode(
                comment: comment,
                depth: 0,
                thread: thread,
                editingId: _editingId,
                editPayload: _editPayload,
                editSaving: _editSaving,
                isSignedIn: widget.isSignedIn,
                viewerUserId: widget.viewerUserId,
                viewerUsername: widget.viewerUsername,
                onRequireAuth: widget.onRequireAuth,
                onReply: _startReply,
                onLike: widget.onLike,
                onEdit: widget.onUpdate == null ? null : _startEdit,
                onDelete: widget.onDelete == null ? null : _confirmDelete,
                onCancelEdit: _cancelEdit,
                onSaveEdit: _saveEdit,
                onEditPayloadChanged: (next) => setState(() => _editPayload = next),
              );
            },
          ),
        if (thread.rootHasMore && thread.rootsLoadingMore)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Center(
              child: SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2, color: primary),
              ),
            ),
          ),
      ],
    );
  }
}

class _CommentThreadNode extends StatelessWidget {
  const _CommentThreadNode({
    required this.comment,
    required this.depth,
    required this.thread,
    required this.editingId,
    required this.editPayload,
    required this.editSaving,
    required this.isSignedIn,
    required this.onReply,
    required this.onCancelEdit,
    required this.onSaveEdit,
    this.viewerUserId,
    this.viewerUsername,
    this.onRequireAuth,
    this.onLike,
    this.onEdit,
    this.onDelete,
    this.onEditPayloadChanged,
  });

  final BlogComment comment;
  final int depth;
  final BlogCommentThreadController thread;
  final String? editingId;
  final Map<String, dynamic>? editPayload;
  final bool editSaving;
  final bool isSignedIn;
  final String? viewerUserId;
  final String? viewerUsername;
  final VoidCallback? onRequireAuth;
  final void Function(BlogComment comment) onReply;
  final Future<void> Function(BlogComment comment)? onLike;
  final void Function(BlogComment comment)? onEdit;
  final Future<void> Function(BlogComment comment)? onDelete;
  final VoidCallback onCancelEdit;
  final Future<void> Function(BlogComment comment) onSaveEdit;
  final ValueChanged<Map<String, dynamic>>? onEditPayloadChanged;

  @override
  Widget build(BuildContext context) {
    final branch = thread.branches[comment.id];
    final childIds = branch?.childIds ?? const <String>[];
    final expanded = branch?.expanded == true;
    final indent = depth > 0 ? (depth.clamp(1, 4) * 8.0) : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _CommentTile(
          comment: comment,
          isSignedIn: isSignedIn,
          isOwner: commentIsOwnedByViewer(
            comment: comment,
            viewerUserId: viewerUserId,
            viewerUsername: viewerUsername,
          ),
          isReply: depth > 0,
          leftIndent: indent,
          isEditing: editingId == comment.id,
          editPayload: editingId == comment.id ? editPayload : null,
          editSaving: editSaving && editingId == comment.id,
          repliesExpanded: expanded,
          repliesLoading: branch?.loading == true,
          directReplyCount: comment.directReplyCount,
          onToggleReplies: comment.directReplyCount > 0
              ? () => thread.toggleReplies(comment.id)
              : null,
          onRequireAuth: onRequireAuth,
          onReply: () => onReply(comment),
          onLike: onLike == null ? null : () => onLike!(comment),
          onEdit: onEdit == null ? null : () => onEdit!(comment),
          onDelete: onDelete == null ? null : () => onDelete!(comment),
          onCancelEdit: onCancelEdit,
          onSaveEdit: () => onSaveEdit(comment),
          onEditPayloadChanged: onEditPayloadChanged,
        ),
        if (expanded && comment.directReplyCount > 0) ...[
          for (final childId in childIds)
            if (thread.commentById(childId) != null)
              _CommentThreadNode(
                comment: thread.commentById(childId)!,
                depth: depth + 1,
                thread: thread,
                editingId: editingId,
                editPayload: editPayload,
                editSaving: editSaving,
                isSignedIn: isSignedIn,
                viewerUserId: viewerUserId,
                viewerUsername: viewerUsername,
                onRequireAuth: onRequireAuth,
                onReply: onReply,
                onLike: onLike,
                onEdit: onEdit,
                onDelete: onDelete,
                onCancelEdit: onCancelEdit,
                onSaveEdit: onSaveEdit,
                onEditPayloadChanged: onEditPayloadChanged,
              ),
          if (branch?.hasMore == true)
            Padding(
              padding: EdgeInsets.only(left: indent + 18, bottom: 8),
              child: TextButton(
                onPressed: branch?.loading == true
                    ? null
                    : () => thread.loadMoreReplies(comment.id),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(
                  branch?.loading == true ? 'Loading…' : 'Load more replies',
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    color: context.appColors.mutedForeground,
                  ),
                ),
              ),
            ),
        ],
      ],
    );
  }
}

class _CommentsEmptyState extends StatelessWidget {
  const _CommentsEmptyState();

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;

    return DashedBorderBox(
      color: colors.border.withValues(alpha: 0.7),
      strokeWidth: 2,
      dashLength: 10,
      dashGap: 6,
      backgroundColor: colors.muted.withValues(alpha: 0.08),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: primary.withValues(alpha: 0.12),
              border: Border.all(color: colors.border.withValues(alpha: 0.6), width: 2),
            ),
            child: Icon(Icons.forum_outlined, size: 22, color: primary),
          ),
          const SizedBox(height: 12),
          Text(
            'No comments yet. Start the thread.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 13,
              height: 1.45,
              color: colors.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}

class _CommentTile extends StatelessWidget {
  const _CommentTile({
    required this.comment,
    required this.isSignedIn,
    required this.isOwner,
    required this.isReply,
    required this.isEditing,
    required this.editPayload,
    required this.editSaving,
    required this.onReply,
    required this.onCancelEdit,
    required this.onSaveEdit,
    this.leftIndent = 0,
    this.repliesExpanded = false,
    this.repliesLoading = false,
    this.directReplyCount = 0,
    this.onToggleReplies,
    this.onRequireAuth,
    this.onLike,
    this.onEdit,
    this.onDelete,
    this.onEditPayloadChanged,
  });

  final BlogComment comment;
  final bool isSignedIn;
  final bool isOwner;
  final bool isReply;
  final double leftIndent;
  final bool isEditing;
  final Map<String, dynamic>? editPayload;
  final bool editSaving;
  final bool repliesExpanded;
  final bool repliesLoading;
  final int directReplyCount;
  final VoidCallback? onToggleReplies;
  final VoidCallback? onRequireAuth;
  final VoidCallback onReply;
  final VoidCallback? onLike;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final VoidCallback onCancelEdit;
  final VoidCallback onSaveEdit;
  final ValueChanged<Map<String, dynamic>>? onEditPayloadChanged;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final authorName = comment.author.fullName.trim().isNotEmpty
        ? comment.author.fullName.trim()
        : comment.author.username.trim();
    final username = comment.author.username.trim();
    final avatarUrl = resolveProfileMediaUrl(comment.author.profileImg);
    final age = blogCardAgeLabel(comment.createdAt);
    final bodyPayload = paragraphPayloadFromCommentText(comment.text);
    final liked = comment.likedByViewer;

    return Padding(
      padding: EdgeInsets.only(bottom: 12, left: leftIndent),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Avatar(url: avatarUrl, label: authorName, colors: colors, size: 40),
          const SizedBox(width: 10),
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                border: Border.all(color: colors.border, width: 1.5),
                color: isReply ? colors.muted.withValues(alpha: 0.05) : colors.muted.withValues(alpha: 0.08),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              authorName.toUpperCase(),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                color: colors.foreground,
                              ),
                            ),
                            if (username.isNotEmpty)
                              Text(
                                '@$username',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.jetBrainsMono(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w600,
                                  color: colors.mutedForeground,
                                ),
                              ),
                          ],
                        ),
                      ),
                      if (age.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            border: Border.all(color: colors.border, width: 1.5),
                            color: colors.background,
                          ),
                          child: Text(
                            age,
                            style: GoogleFonts.jetBrainsMono(
                              fontSize: 8,
                              fontWeight: FontWeight.w700,
                              color: colors.mutedForeground,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (comment.editedAt != null && comment.editedAt!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      'EDITED',
                      style: GoogleFonts.jetBrainsMono(
                        fontSize: 8,
                        fontWeight: FontWeight.w800,
                        color: primary.withValues(alpha: 0.9),
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  if (isEditing && editPayload != null) ...[
                    RichParagraphEditor(
                      key: ValueKey('edit-${comment.id}'),
                      payload: editPayload!,
                      minLines: 2,
                      hintText: 'Edit comment…',
                      showInputBorder: true,
                      onPayloadChanged: (next) => onEditPayloadChanged?.call(next),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        _CommentActionButton(
                          label: 'Cancel',
                          onPressed: editSaving ? null : onCancelEdit,
                          colors: colors,
                        ),
                        const SizedBox(width: 8),
                        _CommentActionButton(
                          label: editSaving ? 'Saving…' : 'Save',
                          onPressed: editSaving ||
                                  editPayload == null ||
                                  !commentDraftIsSubmittable(editPayload!)
                              ? null
                              : onSaveEdit,
                          colors: colors,
                          emphasized: true,
                          primary: primary,
                        ),
                      ],
                    ),
                  ] else ...[
                    ParagraphRichPreview(
                      payload: bodyPayload,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        height: 1.45,
                        color: colors.foreground.withValues(alpha: 0.9),
                      ),
                    ),
                    const SizedBox(height: 8),
                    _CommentActionsRow(
                      comment: comment,
                      colors: colors,
                      primary: primary,
                      isSignedIn: isSignedIn,
                      isOwner: isOwner,
                      liked: liked,
                      repliesExpanded: repliesExpanded,
                      repliesLoading: repliesLoading,
                      directReplyCount: directReplyCount,
                      onToggleReplies: onToggleReplies,
                      onRequireAuth: onRequireAuth,
                      onReply: onReply,
                      onLike: onLike,
                      onEdit: onEdit,
                      onDelete: onDelete,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CommentActionsRow extends StatelessWidget {
  const _CommentActionsRow({
    required this.comment,
    required this.colors,
    required this.primary,
    required this.isSignedIn,
    required this.isOwner,
    required this.liked,
    required this.onReply,
    this.repliesExpanded = false,
    this.repliesLoading = false,
    this.directReplyCount = 0,
    this.onToggleReplies,
    this.onRequireAuth,
    this.onLike,
    this.onEdit,
    this.onDelete,
  });

  final BlogComment comment;
  final AppColorTokens colors;
  final Color primary;
  final bool isSignedIn;
  final bool isOwner;
  final bool liked;
  final bool repliesExpanded;
  final bool repliesLoading;
  final int directReplyCount;
  final VoidCallback? onToggleReplies;
  final VoidCallback? onRequireAuth;
  final VoidCallback onReply;
  final VoidCallback? onLike;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        _CommentActionButton(
          icon: Icons.reply_rounded,
          semanticLabel: 'Reply',
          onPressed: onReply,
          colors: colors,
        ),
        if (directReplyCount > 0 && onToggleReplies != null) ...[
          const SizedBox(width: 12),
          _CommentActionButton(
            iconWidget: _CommentRepliesToggleIcon(
              expanded: repliesExpanded,
              color: repliesExpanded ? primary : colors.mutedForeground,
            ),
            badge: repliesExpanded ? null : '$directReplyCount',
            semanticLabel: repliesExpanded ? 'Hide replies' : 'View replies',
            onPressed: repliesLoading ? null : onToggleReplies,
            colors: colors,
            active: repliesExpanded,
            primary: primary,
          ),
        ],
        const SizedBox(width: 12),
        _CommentActionButton(
          icon: liked ? Icons.favorite : Icons.favorite_border,
          badge: comment.likeCount > 0 ? '${comment.likeCount}' : null,
          semanticLabel: 'Like',
          onPressed: () {
            if (!isSignedIn) {
              onRequireAuth?.call();
              return;
            }
            onLike?.call();
          },
          colors: colors,
          active: liked,
          primary: primary,
        ),
        if (isOwner) ...[
          if (onEdit != null) ...[
            const SizedBox(width: 12),
            _CommentActionButton(
              icon: Icons.edit_outlined,
              semanticLabel: 'Edit',
              onPressed: onEdit,
              colors: colors,
            ),
          ],
          if (onDelete != null) ...[
            const SizedBox(width: 12),
            _CommentActionButton(
              icon: Icons.delete_outline,
              semanticLabel: 'Delete',
              onPressed: onDelete,
              colors: colors,
              destructive: true,
            ),
          ],
        ],
      ],
    );
  }
}

class _CommentRepliesToggleIcon extends StatelessWidget {
  const _CommentRepliesToggleIcon({
    required this.expanded,
    required this.color,
  });

  final bool expanded;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 20,
      height: 16,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          Icon(Icons.forum_outlined, size: 14, color: color),
          Positioned(
            right: -3,
            bottom: -4,
            child: Icon(
              expanded ? Icons.expand_less_rounded : Icons.expand_more_rounded,
              size: 11,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _CommentActionButton extends StatelessWidget {
  const _CommentActionButton({
    required this.colors,
    this.label,
    this.icon,
    this.iconWidget,
    this.badge,
    this.semanticLabel,
    this.onPressed,
    this.active = false,
    this.emphasized = false,
    this.destructive = false,
    this.primary,
  });

  final String? label;
  final IconData? icon;
  final Widget? iconWidget;
  final String? badge;
  final String? semanticLabel;
  final VoidCallback? onPressed;
  final AppColorTokens colors;
  final bool active;
  final bool emphasized;
  final bool destructive;
  final Color? primary;

  @override
  Widget build(BuildContext context) {
    final fg = destructive
        ? colors.destructive
        : active
            ? (primary ?? Theme.of(context).colorScheme.primary)
            : emphasized
                ? colors.foreground
                : colors.mutedForeground;

    if (emphasized) {
      return FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          minimumSize: const Size(0, 30),
          padding: const EdgeInsets.symmetric(horizontal: 10),
          shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        ),
        child: Text(
          (label ?? '').toUpperCase(),
          style: GoogleFonts.jetBrainsMono(fontSize: 9, fontWeight: FontWeight.w800),
        ),
      );
    }

    final content = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (iconWidget != null)
          iconWidget!
        else if (icon != null)
          Icon(icon, size: 16, color: fg),
        if (badge != null) ...[
          const SizedBox(width: 3),
          Text(
            badge!,
            style: GoogleFonts.jetBrainsMono(
              fontSize: 9,
              fontWeight: FontWeight.w800,
              color: fg,
            ),
          ),
        ],
        if (label != null && label!.isNotEmpty && icon == null && iconWidget == null)
          Text(
            label!.toUpperCase(),
            style: GoogleFonts.jetBrainsMono(
              fontSize: 9,
              fontWeight: FontWeight.w800,
              color: fg,
            ),
          ),
      ],
    );

    return Semantics(
      button: true,
      label: semanticLabel ?? label,
      child: InkWell(
        onTap: onPressed,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 2),
          child: content,
        ),
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({
    required this.url,
    required this.label,
    required this.colors,
    this.size = 30,
  });

  final String url;
  final String label;
  final AppColorTokens colors;
  final double size;

  @override
  Widget build(BuildContext context) {
    final letter = label.isNotEmpty ? label[0].toUpperCase() : '?';
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        border: Border.all(color: colors.border, width: 2),
        color: colors.muted.withValues(alpha: 0.2),
      ),
      clipBehavior: Clip.hardEdge,
      child: url.isNotEmpty
          ? Image.network(
              url,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => Center(
                child: Text(
                  letter,
                  style: GoogleFonts.inter(fontSize: size * 0.35, fontWeight: FontWeight.w900),
                ),
              ),
            )
          : Center(
              child: Text(
                letter,
                style: GoogleFonts.inter(fontSize: size * 0.35, fontWeight: FontWeight.w900),
              ),
            ),
    );
  }
}
