import 'package:flutter/material.dart';

import '../ui/app_action_menu.dart';

/// Squad detail overflow actions — leave, edit, delete, copy invite.
class SquadOverflowMenu extends StatelessWidget {
  const SquadOverflowMenu({
    super.key,
    this.onLeave,
    this.onEdit,
    this.onDelete,
    this.onCopyInvite,
  });

  final VoidCallback? onLeave;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final VoidCallback? onCopyInvite;

  @override
  Widget build(BuildContext context) {
    final items = <AppActionMenuItem>[
      if (onEdit != null)
        AppActionMenuItem(
          id: 'edit',
          label: 'Edit squad',
          icon: Icons.edit_rounded,
          onTap: onEdit,
        ),
      if (onLeave != null)
        AppActionMenuItem(
          id: 'leave',
          label: 'Leave group',
          icon: Icons.logout_rounded,
          onTap: onLeave,
        ),
      if (onDelete != null)
        AppActionMenuItem(
          id: 'delete',
          label: 'Delete squad',
          icon: Icons.delete_outline_rounded,
          destructive: true,
          onTap: onDelete,
        ),
      if (onCopyInvite != null)
        AppActionMenuItem(
          id: 'copy',
          label: 'Copy invitation',
          icon: Icons.link_rounded,
          onTap: onCopyInvite,
        ),
    ];

    if (items.isEmpty) return const SizedBox.shrink();

    return AppActionMenu(
      items: items,
      itemHeight: 40,
      triggerWidth: 40,
      triggerHeight: 40,
      minWidth: 220,
      iconSize: 22,
      rotateTriggerIcon: false,
      preferOpenUpward: true,
      triggerIconColor: Colors.white,
      triggerDecoration: BoxDecoration(
        border: Border.all(color: Colors.white.withValues(alpha: 0.7), width: 2),
        color: Colors.black.withValues(alpha: 0.5),
      ),
    );
  }
}
