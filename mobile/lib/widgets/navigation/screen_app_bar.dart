import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import 'app_nav_colors.dart';
import 'main_app_bar.dart';

/// Pushed-screen top bar — back button, centered title, main-menu divider.
///
/// Uses [AppBar] so content sits below the status bar / Dynamic Island.
/// Use on every screen except the main tab roots (Home, Trending, Account, Squads).
class ScreenAppBar extends StatelessWidget implements PreferredSizeWidget {
  const ScreenAppBar({
    super.key,
    required this.title,
    this.actions,
    this.onBack,
    this.leading,
    this.extraBottom,
    this.titleWidget,
    this.centerTitle = true,
    this.narrowLeading = false,
  });

  final String title;
  final List<Widget>? actions;
  final VoidCallback? onBack;
  final Widget? leading;
  final PreferredSizeWidget? extraBottom;
  final Widget? titleWidget;
  final bool centerTitle;
  final bool narrowLeading;

  static const bottomBorderHeight = MainAppBar.bottomBorderHeight;

  static TextStyle titleStyle(BuildContext context) {
    return GoogleFonts.inter(
      fontSize: 14,
      fontWeight: FontWeight.w900,
      letterSpacing: 1.4,
      color: context.appColors.foreground,
    );
  }

  double get _extraBottomHeight => extraBottom?.preferredSize.height ?? 0;

  double get _bottomHeight => bottomBorderHeight + _extraBottomHeight;

  @override
  Size get preferredSize => Size.fromHeight(kToolbarHeight + _bottomHeight);

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return AppBar(
      backgroundColor: colors.background,
      foregroundColor: colors.foreground,
      elevation: 0,
      scrolledUnderElevation: 0,
      surfaceTintColor: Colors.transparent,
      automaticallyImplyLeading: false,
      centerTitle: centerTitle,
      toolbarHeight: kToolbarHeight,
      leadingWidth: narrowLeading
          ? MainAppBar.edgePadding + MainAppBar.iconHitSize
          : MainAppBar.sideRailWidth,
      titleSpacing: 0,
      leading: Padding(
        padding: const EdgeInsets.only(left: MainAppBar.edgePadding),
        child: Align(
          alignment: Alignment.centerLeft,
          child: leading ??
              IconButton(
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(
                  minWidth: MainAppBar.iconHitSize,
                  minHeight: MainAppBar.iconHitSize,
                ),
                icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
                tooltip: 'Back',
                onPressed: onBack ?? () => Navigator.maybePop(context),
              ),
        ),
      ),
      title: titleWidget ??
          Text(
            title.toUpperCase(),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: titleStyle(context),
          ),
      actions: [
        SizedBox(
          width: MainAppBar.sideRailWidth,
          child: Padding(
            padding: const EdgeInsets.only(right: MainAppBar.edgePadding),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: actions ?? const [],
            ),
          ),
        ),
      ],
      bottom: PreferredSize(
        preferredSize: Size.fromHeight(_bottomHeight),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              height: bottomBorderHeight,
              width: double.infinity,
              color: AppNavColors.headerDivider(context),
            ),
            if (extraBottom != null) extraBottom!,
          ],
        ),
      ),
    );
  }
}
