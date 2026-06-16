import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/blog_feed_post.dart';
import '../../models/bookmark_group.dart';
import '../../services/auth_api.dart';
import '../../services/bookmarks_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/blog_navigation.dart';
import '../blog/blog_card.dart';
import '../blog/blog_card_skeleton.dart';
import '../ui/app_action_menu.dart';
import '../ui/app_confirm_dialog.dart';
import '../ui/app_feedback_toast.dart';
import '../ui/app_tappable.dart';
import 'bookmark_folder_form_dialog.dart';
import 'profile_activity_shared.dart';

class ProfileBookmarksPanel extends StatefulWidget {
  const ProfileBookmarksPanel({super.key});

  @override
  State<ProfileBookmarksPanel> createState() => ProfileBookmarksPanelState();
}

class ProfileBookmarksPanelState extends State<ProfileBookmarksPanel> {
  final _api = BookmarksApi();

  List<BookmarkGroup> _groups = const [];
  List<BlogFeedPost> _posts = const [];
  bool _postsLoading = true;
  String _selectedFilter = 'all';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => reload());
  }

  Future<void> reload() async {
    await Future.wait([_loadGroups(), _loadPosts()]);
  }

  String? get _token => context.read<AuthState>().accessToken;

  Future<void> _loadGroups() async {
    final token = _token;
    if (token == null || token.isEmpty) {
      setState(() {
        _groups = const [];
      });
      return;
    }

    try {
      final groups = await _api.listGroups(accessToken: token);
      if (!mounted) return;
      setState(() {
        _groups = groups;
        if (_selectedFilter != 'all' &&
            !groups.any((g) => g.id == _selectedFilter)) {
          _selectedFilter = 'all';
        }
      });
    } on AuthApiException catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(context, e.message);
    } catch (_) {
      if (!mounted) return;
      AppFeedbackToast.error(context, 'Could not load folders.');
    }
  }

  Future<void> _loadPosts() async {
    final token = _token;
    if (token == null || token.isEmpty) {
      setState(() {
        _postsLoading = false;
        _posts = const [];
      });
      return;
    }

    setState(() => _postsLoading = true);
    try {
      final posts = await _api.listBookmarkedPosts(
        accessToken: token,
        groupId: _selectedFilter == 'all' ? null : _selectedFilter,
        limit: 80,
        sort: 'newest',
      );
      if (!mounted) return;
      setState(() {
        _posts = posts;
        _postsLoading = false;
      });
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _posts = const [];
        _postsLoading = false;
      });
      AppFeedbackToast.error(context, e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _posts = const [];
        _postsLoading = false;
      });
      AppFeedbackToast.error(context, 'Could not load bookmarks.');
    }
  }

  Future<void> _openCreateFolder() async {
    final values = await showBookmarkFolderFormDialog(
      context,
      isCreate: true,
      initial: const BookmarkFolderFormValues(),
    );
    if (values == null || !mounted) return;

    final token = _token;
    if (token == null || token.isEmpty) return;

    try {
      await _api.createGroup(
        accessToken: token,
        name: values.name,
        emoji: values.emoji,
        makeDefault: values.makeDefault,
      );
      if (!mounted) return;
      AppFeedbackToast.success(context, 'Folder created.');
      await _loadGroups();
      if (values.makeDefault) await _loadPosts();
    } on AuthApiException catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(context, e.message);
    } catch (_) {
      if (!mounted) return;
      AppFeedbackToast.error(context, 'Could not create folder.');
    }
  }

  Future<void> _openEditFolder(BookmarkGroup group) async {
    final values = await showBookmarkFolderFormDialog(
      context,
      isCreate: false,
      initial: BookmarkFolderFormValues(
        name: group.name,
        emoji: group.emoji,
      ),
    );
    if (values == null || !mounted) return;

    final token = _token;
    if (token == null || token.isEmpty) return;

    try {
      await _api.updateGroup(
        accessToken: token,
        groupId: group.id,
        name: values.name,
        emoji: values.emoji,
      );
      if (!mounted) return;
      AppFeedbackToast.success(context, 'Folder updated.');
      await _loadGroups();
    } on AuthApiException catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(context, e.message);
    } catch (_) {
      if (!mounted) return;
      AppFeedbackToast.error(context, 'Could not update folder.');
    }
  }

  Future<void> _confirmSetDefault(BookmarkGroup group) async {
    if (group.isDefault) return;
    final confirmed = await AppConfirmDialog.show(
      context,
      title: 'CHANGE DEFAULT FOLDER?',
      message:
          'New saves will go to "${group.name}" unless you pick another folder when bookmarking.',
      confirmLabel: 'MAKE DEFAULT',
      variant: AppConfirmDialogVariant.warning,
    );
    if (confirmed != true || !mounted) return;

    final token = _token;
    if (token == null || token.isEmpty) return;

    try {
      await _api.setDefaultGroup(accessToken: token, groupId: group.id);
      if (!mounted) return;
      AppFeedbackToast.success(context, 'Default folder updated.');
      await _loadGroups();
    } on AuthApiException catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(context, e.message);
    } catch (_) {
      if (!mounted) return;
      AppFeedbackToast.error(context, 'Could not update default folder.');
    }
  }

  Future<void> _confirmDeleteFolder(BookmarkGroup group) async {
    if (group.isDefault) return;
    final confirmed = await AppConfirmDialog.show(
      context,
      title: 'DELETE THIS FOLDER?',
      message:
          '"${group.name}" will be removed. Saved posts in this folder move to your default folder.',
      confirmLabel: 'DELETE FOLDER',
    );
    if (confirmed != true || !mounted) return;

    final token = _token;
    if (token == null || token.isEmpty) return;

    try {
      await _api.deleteGroup(accessToken: token, groupId: group.id);
      if (!mounted) return;
      AppFeedbackToast.success(context, 'Folder deleted.');
      if (_selectedFilter == group.id) {
        setState(() => _selectedFilter = 'all');
      }
      await Future.wait([_loadGroups(), _loadPosts()]);
    } on AuthApiException catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(context, e.message);
    } catch (_) {
      if (!mounted) return;
      AppFeedbackToast.error(context, 'Could not delete folder.');
    }
  }

  void _selectFilter(String filter) {
    if (_selectedFilter == filter) return;
    setState(() => _selectedFilter = filter);
    _loadPosts();
  }

  void _syncPost(BlogFeedPost next) {
    if (!next.viewerHasBookmarked) {
      setState(() => _posts = _posts.where((p) => p.id != next.id).toList());
      return;
    }
    setState(() {
      _posts = [
        for (final post in _posts) post.id == next.id ? next : post,
      ];
    });
  }

  static const _chipHeight = 40.0;
  static const _chipSpacing = 6.0;
  static const _folderLabelMaxWidth = 96.0;

  @override
  Widget build(BuildContext context) {
    final hasFolderFilter = _selectedFilter != 'all';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          height: _chipHeight,
          child: Row(
            children: [
              Expanded(
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: EdgeInsets.zero,
                  itemCount: 1 + _groups.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(width: _chipSpacing),
                  itemBuilder: (context, index) {
                    if (index == 0) {
                      return _FolderFilterChip(
                        height: _chipHeight,
                        label: 'All saved',
                        active: _selectedFilter == 'all',
                        onTap: () => _selectFilter('all'),
                      );
                    }
                    final group = _groups[index - 1];
                    return _BookmarkFolderChip(
                      height: _chipHeight,
                      labelMaxWidth: _folderLabelMaxWidth,
                      group: group,
                      active: _selectedFilter == group.id,
                      onSelect: () => _selectFilter(group.id),
                      onEdit: () => _openEditFolder(group),
                      onMakeDefault: () => _confirmSetDefault(group),
                      onDelete: () => _confirmDeleteFolder(group),
                    );
                  },
                ),
              ),
              const SizedBox(width: _chipSpacing),
              _CreateFolderChipButton(
                height: _chipHeight,
                onTap: _openCreateFolder,
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (_postsLoading)
          const BlogCardListSkeleton(count: 4)
        else if (_posts.isEmpty && hasFolderFilter)
          ProfileActivityEmpty(
            icon: Icons.bookmark_border_rounded,
            title: 'No bookmarks in this folder',
            message: 'Try another folder or view all saved posts.',
            actionLabel: 'All saved',
            onAction: () => _selectFilter('all'),
          )
        else if (_posts.isEmpty)
          const ProfileActivityEmpty(
            icon: Icons.bookmark_border_rounded,
            title: 'No bookmarks yet',
            message:
                'Save posts from your feed or open a story and tap Bookmark — they will show up here.',
          )
        else
          Column(
            children: [
              for (var i = 0; i < _posts.length; i++) ...[
                if (i > 0) const SizedBox(height: 16),
                BlogCard(
                  post: _posts[i],
                  onTap: () => openBlogFeedPost(context, _posts[i]),
                  onPostChanged: (next) => _syncPost(next),
                ),
              ],
            ],
          ),
      ],
    );
  }
}

class _CreateFolderChipButton extends StatelessWidget {
  const _CreateFolderChipButton({
    required this.height,
    required this.onTap,
  });

  final double height;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return AppTappable(
      onTap: onTap,
      splashColor: appRippleOnSurface(colors),
      color: colors.card,
      decoration: BoxDecoration(
        border: Border.all(color: colors.border, width: 2),
        color: colors.card,
      ),
      child: SizedBox(
        width: height,
        height: height,
        child: Icon(
          Icons.add_rounded,
          size: 20,
          color: colors.primary,
        ),
      ),
    );
  }
}

class _FolderFilterChip extends StatelessWidget {
  const _FolderFilterChip({
    required this.height,
    required this.label,
    required this.active,
    required this.onTap,
  });

  final double height;
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return AppTappable(
      onTap: onTap,
      splashColor: appRippleOnSurface(colors),
      color: active ? colors.primary.withValues(alpha: 0.12) : colors.card,
      decoration: BoxDecoration(
        color: active ? colors.primary.withValues(alpha: 0.12) : colors.card,
        border: Border.all(
          color: active ? colors.primary : colors.border,
          width: 2,
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: SizedBox(
        height: height,
        child: Center(
          child: Text(
            label.toUpperCase(),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: bookmarkChipLabelStyle(context, active: active),
          ),
        ),
      ),
    );
  }
}

class _BookmarkFolderChip extends StatelessWidget {
  const _BookmarkFolderChip({
    required this.height,
    required this.labelMaxWidth,
    required this.group,
    required this.active,
    required this.onSelect,
    required this.onEdit,
    required this.onMakeDefault,
    required this.onDelete,
  });

  final double height;
  final double labelMaxWidth;
  final BookmarkGroup group;
  final bool active;
  final VoidCallback onSelect;
  final VoidCallback onEdit;
  final VoidCallback onMakeDefault;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(
          color: active ? colors.primary : colors.border,
          width: 2,
        ),
        color: active ? colors.primary.withValues(alpha: 0.1) : colors.card,
      ),
      child: SizedBox(
        height: height,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: onSelect,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(8, 0, 2, 0),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (group.isDefault) ...[
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: colors.primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                      ],
                      if (group.emoji.isNotEmpty) ...[
                        Text(group.emoji, style: const TextStyle(fontSize: 14)),
                        const SizedBox(width: 4),
                      ],
                      ConstrainedBox(
                        constraints: BoxConstraints(maxWidth: labelMaxWidth),
                        child: Text(
                          group.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: bookmarkChipLabelStyle(context, active: active),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            AppActionMenu(
              itemHeight: height,
              triggerHeight: height,
              items: [
                AppActionMenuItem(
                  id: 'edit',
                  label: 'Edit folder',
                  icon: Icons.edit_outlined,
                  onTap: onEdit,
                ),
                AppActionMenuItem(
                  id: 'default',
                  label: 'Make default',
                  icon: Icons.star_outline_rounded,
                  enabled: !group.isDefault,
                  onTap: onMakeDefault,
                ),
                AppActionMenuItem(
                  id: 'delete',
                  label: 'Delete folder',
                  icon: Icons.delete_outline_rounded,
                  enabled: !group.isDefault,
                  destructive: true,
                  onTap: onDelete,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
