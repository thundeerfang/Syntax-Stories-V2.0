import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import '../profile/profile_activity_shared.dart';

class TrendingSectionHeader extends StatelessWidget {
  const TrendingSectionHeader({
    super.key,
    required this.title,
    this.postCount,
    this.onViewAll,
    this.viewAllLabel = 'VIEW ALL',
    this.horizontalPadding = 16,
  });

  final String title;
  final int? postCount;
  final VoidCallback? onViewAll;
  final String viewAllLabel;
  final double horizontalPadding;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final count = postCount ?? 0;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        horizontalPadding,
        horizontalPadding == 0 ? 10 : 16,
        horizontalPadding,
        horizontalPadding == 0 ? 8 : 10,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Row(
              children: [
                Flexible(
                  child: Text(
                    title.toUpperCase(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.1,
                      color: colors.foreground,
                    ),
                  ),
                ),
                if (count > 0) ...[
                  const SizedBox(width: 8),
                  ProfileCountPill(
                    count: count,
                    semanticLabel: '$count posts',
                  ),
                ],
              ],
            ),
          ),
          if (onViewAll != null)
            TextButton(
              onPressed: onViewAll,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text(
                viewAllLabel,
                style: GoogleFonts.inter(
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.8,
                  color: primary,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
