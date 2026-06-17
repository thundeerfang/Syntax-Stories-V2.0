import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/blog_feed_post.dart';
import '../../theme/app_color_tokens.dart';
import '../blog/blog_card.dart';
import '../ui/app_action_menu.dart';

enum ProfileUserBlogCardMode { published, draft, deleted }

class ProfileUserBlogCard extends StatelessWidget {
  const ProfileUserBlogCard({
    super.key,
    required this.post,
    required this.mode,
    required this.onOpen,
    this.deletedMeta,
    this.restoreBusy = false,
    this.onEdit,
    this.onDelete,
    this.onRestore,
    this.onPurge,
  });

  final BlogFeedPost post;
  final ProfileUserBlogCardMode mode;
  final VoidCallback onOpen;
  final String? deletedMeta;
  final bool restoreBusy;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final VoidCallback? onRestore;
  final VoidCallback? onPurge;

  List<AppActionMenuItem> get _menuItems {
    return switch (mode) {
      ProfileUserBlogCardMode.published => [
          AppActionMenuItem(
            id: 'edit',
            label: 'Edit',
            icon: Icons.edit_outlined,
            onTap: onEdit,
          ),
          AppActionMenuItem(
            id: 'delete',
            label: 'Delete',
            icon: Icons.delete_outline_rounded,
            destructive: true,
            onTap: onDelete,
          ),
        ],
      ProfileUserBlogCardMode.draft => [
          AppActionMenuItem(
            id: 'edit',
            label: 'Edit',
            icon: Icons.edit_outlined,
            onTap: onEdit,
          ),
          AppActionMenuItem(
            id: 'delete',
            label: 'Delete',
            icon: Icons.delete_outline_rounded,
            destructive: true,
            onTap: onDelete,
          ),
        ],
      ProfileUserBlogCardMode.deleted => [
          AppActionMenuItem(
            id: 'restore',
            label: restoreBusy ? 'Restoring…' : 'Restore',
            icon: Icons.restore_rounded,
            enabled: !restoreBusy,
            onTap: onRestore,
          ),
          AppActionMenuItem(
            id: 'purge',
            label: 'Delete forever',
            icon: Icons.delete_forever_outlined,
            destructive: true,
            onTap: onPurge,
          ),
        ],
    };
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final showMenu = onEdit != null || onDelete != null || onRestore != null || onPurge != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            BlogCard(
              post: post,
              onTap: onOpen,
              showEngagement: mode == ProfileUserBlogCardMode.published,
            ),
            if (showMenu)
              Positioned(
                top: 8,
                right: 8,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: colors.card.withValues(alpha: 0.94),
                    border: Border.all(color: colors.border, width: 2),
                  ),
                  child: AppActionMenu(
                    items: _menuItems,
                    triggerWidth: 36,
                    triggerHeight: 36,
                    itemHeight: 40,
                    minWidth: 196,
                  ),
                ),
              ),
          ],
        ),
        if (mode == ProfileUserBlogCardMode.deleted &&
            deletedMeta != null &&
            deletedMeta!.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            deletedMeta!,
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: colors.mutedForeground,
            ),
          ),
        ],
      ],
    );
  }
}
