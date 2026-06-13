import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import 'app_nav_colors.dart';

/// Fixed top bar below the status bar — equal left/right inset, centered title.
class MainAppBar extends StatelessWidget implements PreferredSizeWidget {
  const MainAppBar({
    super.key,
    required this.title,
    this.onSearch,
    this.onNotifications,
    this.onSettings,
    this.onCreate,
    this.showNotifications = true,
  });

  final String title;
  final VoidCallback? onSearch;
  final VoidCallback? onNotifications;
  final VoidCallback? onSettings;
  final VoidCallback? onCreate;
  final bool showNotifications;

  static const toolbarHeight = kToolbarHeight;
  static const edgePadding = 16.0;
  static const logoSize = 34.0;
  static const iconSize = 22.0;
  static const iconHitSize = 40.0;
  static const sideRailWidth = 96.0;
  static const bottomBorderHeight = 1.0;

  static double totalHeight(BuildContext context) =>
      MediaQuery.paddingOf(context).top + toolbarHeight + bottomBorderHeight;

  @override
  Size get preferredSize => const Size.fromHeight(toolbarHeight + bottomBorderHeight);

  @override
  Widget build(BuildContext context) {
    final inactive = AppNavColors.inactive(context);
    final primary = Theme.of(context).colorScheme.primary;
    final topInset = MediaQuery.paddingOf(context).top;

    return Material(
      color: context.appColors.background,
      elevation: 0,
      child: SizedBox(
        height: totalHeight(context),
        width: double.infinity,
        child: Column(
          children: [
            SizedBox(
              height: topInset + toolbarHeight,
              child: Padding(
                padding: EdgeInsets.only(top: topInset),
                child: Row(
                  children: [
                    SizedBox(
                      width: sideRailWidth,
                      child: Padding(
                        padding: const EdgeInsets.only(left: edgePadding),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Image.asset(
                            'assets/logo.png',
                            width: logoSize,
                            height: logoSize,
                            fit: BoxFit.contain,
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: Text(
                        title.toUpperCase(),
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.4,
                          color: context.appColors.foreground,
                        ),
                      ),
                    ),
                    SizedBox(
                      width: sideRailWidth,
                      child: Padding(
                        padding: const EdgeInsets.only(right: edgePadding),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            _TopNavIcon(
                              icon: Icons.search_rounded,
                              tooltip: 'Search',
                              color: inactive,
                              onTap: onSearch,
                            ),
                            if (onCreate != null)
                              _TopNavAddButton(onTap: onCreate)
                            else if (showNotifications)
                              _TopNavIcon(
                                icon: Icons.notifications_none_rounded,
                                tooltip: 'Notifications',
                                color: inactive,
                                onTap: onNotifications,
                              )
                            else
                              _TopNavIcon(
                                icon: Icons.menu_rounded,
                                tooltip: 'Settings',
                                color: inactive,
                                onTap: onSettings,
                              ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Container(height: bottomBorderHeight, color: primary),
          ],
        ),
      ),
    );
  }
}

class _TopNavAddButton extends StatelessWidget {
  const _TopNavAddButton({this.onTap});

  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return SizedBox(
      width: MainAppBar.iconHitSize,
      height: MainAppBar.iconHitSize,
      child: Material(
        color: colors.primary,
        child: InkWell(
          onTap: onTap,
          child: Icon(
            Icons.add_rounded,
            color: colors.primaryForeground,
            size: MainAppBar.iconSize,
          ),
        ),
      ),
    );
  }
}

class _TopNavIcon extends StatelessWidget {
  const _TopNavIcon({
    required this.icon,
    required this.tooltip,
    required this.color,
    this.onTap,
  });

  final IconData icon;
  final String tooltip;
  final Color color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: MainAppBar.iconHitSize,
      height: MainAppBar.iconHitSize,
      child: IconButton(
        tooltip: tooltip,
        onPressed: onTap,
        padding: EdgeInsets.zero,
        constraints: const BoxConstraints(),
        icon: Icon(icon, color: color, size: MainAppBar.iconSize),
      ),
    );
  }
}
