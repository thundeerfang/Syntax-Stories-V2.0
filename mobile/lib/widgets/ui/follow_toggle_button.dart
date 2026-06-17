import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import 'app_tappable.dart';

/// Follow / Unfollow toggle — mirrors webapp `FollowToggleButton`.
class FollowToggleButton extends StatelessWidget {
  const FollowToggleButton({
    super.key,
    required this.isFollowing,
    required this.onPressed,
    this.busy = false,
    this.followLabel = 'FOLLOW',
    this.unfollowLabel = 'UNFOLLOW',
    this.compact = false,
  });

  final bool isFollowing;
  final VoidCallback? onPressed;
  final bool busy;
  final String followLabel;
  final String unfollowLabel;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final label = isFollowing ? unfollowLabel : followLabel;
    final hPad = compact ? 8.0 : 12.0;
    final vPad = compact ? 6.0 : 8.0;
    final fill = isFollowing ? colors.card : primary;

    return AppTappable(
      onTap: busy ? null : onPressed,
      color: fill,
      splashColor: isFollowing ? appRippleOnSurface(colors) : appRippleOnPrimary(colors),
      decoration: BoxDecoration(
        color: fill,
        border: Border.all(color: primary, width: 2),
      ),
      padding: EdgeInsets.symmetric(horizontal: hPad, vertical: vPad),
      child: busy
          ? SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: isFollowing ? primary : colors.primaryForeground,
              ),
            )
          : Text(
              label,
              style: GoogleFonts.inter(
                fontSize: compact ? 9 : 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.8,
                color: isFollowing ? primary : colors.primaryForeground,
              ),
            ),
    );
  }
}
