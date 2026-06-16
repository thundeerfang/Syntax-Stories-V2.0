import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';

/// Scroll clearance for content sitting just above the curved bottom nav.
const kBottomNavScrollClearance = 76.0;

/// Compact footer shown after the last item in a scrollable feed.
class FeedListEndMarker extends StatelessWidget {
  const FeedListEndMarker({
    super.key,
    this.message = "You've reached the end",
    this.icon = Icons.flag_outlined,
    this.includeNavClearance = true,
  });

  final String message;
  final IconData icon;
  final bool includeNavClearance;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    final bottomPad = includeNavClearance ? bottomInset + kBottomNavScrollClearance : 8.0;

    return Padding(
      padding: EdgeInsets.fromLTRB(24, 16, 24, bottomPad),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 22,
            color: colors.mutedForeground.withValues(alpha: 0.75),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: colors.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}
