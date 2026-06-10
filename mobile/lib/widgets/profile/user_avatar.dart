import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/user_summary.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/resolve_profile_media_url.dart';

/// Square profile avatar — used in app bar and account tab.
class UserAvatar extends StatelessWidget {
  const UserAvatar({
    super.key,
    required this.user,
    this.size = 36,
    this.onTap,
    this.selected = false,
    this.showBorder = true,
  });

  final UserSummary? user;
  final double size;
  final VoidCallback? onTap;
  final bool selected;
  final bool showBorder;

  String get _initials {
    final name = user?.displayName ?? '?';
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2 && parts[0].isNotEmpty && parts[1].isNotEmpty) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    if (name.isEmpty) return '?';
    return name.substring(0, name.length >= 2 ? 2 : 1).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    final img = resolveProfileMediaUrl(user?.profileImg);

    final avatar = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: context.appColors.muted.withValues(alpha: 0.45),
        border: showBorder
            ? Border.all(
                color: selected ? primary : context.appColors.border.withValues(alpha: 0.35),
                width: selected ? 2.5 : 2,
              )
            : null,
      ),
      clipBehavior: Clip.hardEdge,
      child: img.isNotEmpty
          ? Image.network(
              img,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => _initialsTile(context),
            )
          : _initialsTile(context),
    );

    if (onTap == null) return avatar;
    return Material(
      color: Colors.transparent,
      child: InkWell(onTap: onTap, child: avatar),
    );
  }

  Widget _initialsTile(BuildContext context) {
    return Center(
      child: Text(
        _initials,
        style: GoogleFonts.inter(
          fontSize: size * 0.34,
          fontWeight: FontWeight.w800,
          color: context.appColors.foreground,
        ),
      ),
    );
  }
}
