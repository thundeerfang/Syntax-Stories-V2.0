import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_nav_colors.dart';
import '../../theme/app_color_tokens.dart';
import '../ui/app_tappable.dart';

class CurvedBottomNavItem {
  const CurvedBottomNavItem({
    required this.outlineIcon,
    required this.filledIcon,
    required this.label,
    this.isWriteAction = false,
  });

  final IconData outlineIcon;
  final IconData filledIcon;
  final String label;
  final bool isWriteAction;
}

class CurvedBottomNavBar extends StatelessWidget {
  const CurvedBottomNavBar({
    super.key,
    required this.items,
    required this.selectedIndex,
    required this.onTap,
  });

  /// Index in [items], or `-1` when no tab is selected (e.g. Explore open).
  final List<CurvedBottomNavItem> items;
  final int selectedIndex;
  final ValueChanged<int> onTap;

  static const _barHeight = 62.0;
  static const _fabSquareSize = 48.0;
  static const _fabLift = 14.0;
  static const _dotSlotHeight = 10.0;

  int get _writeIndex => items.indexWhere((i) => i.isWriteAction);

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    final width = MediaQuery.sizeOf(context).width;
    final activeColor = AppNavColors.active(context);
    final inactiveColor = AppNavColors.inactive(context);
    final barBackground = AppNavColors.barBackground(context);
    final writeIndex = _writeIndex;

    return SizedBox(
      height: _barHeight + bottomInset + _fabLift,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.bottomCenter,
        children: [
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            height: _barHeight + bottomInset + _fabLift,
            child: CustomPaint(
              size: Size(width, _barHeight + bottomInset + _fabLift),
              painter: _NavBarBackgroundPainter(
                width: width,
                barHeight: _barHeight + bottomInset,
                fabCenterX: width / 2,
                fabHalfWidth: _fabSquareSize / 2 + 4,
                backgroundColor: barBackground,
                shadowColor: AppNavColors.barShadow(context),
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: bottomInset,
            height: _barHeight,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: List.generate(items.length, (index) {
                final item = items[index];
                if (item.isWriteAction) {
                  return SizedBox(
                    width: width / items.length,
                    height: _barHeight,
                    child: const SizedBox.shrink(),
                  );
                }

                final selected = index == selectedIndex;
                final colors = context.appColors;
                return SizedBox(
                  width: width / items.length,
                  height: _barHeight,
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => onTap(index),
                      splashColor: appRippleOnSurface(colors),
                      highlightColor: appRippleOnSurface(colors).withValues(alpha: 0.08),
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            SizedBox(
                              height: _dotSlotHeight,
                              child: Center(
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 200),
                                  width: selected ? 5 : 0,
                                  height: selected ? 5 : 0,
                                  decoration: BoxDecoration(
                                    color: activeColor,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.only(top: 2),
                              child: Icon(
                                selected ? item.filledIcon : item.outlineIcon,
                                size: 22,
                                color: selected ? activeColor : inactiveColor,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              item.label,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: selected ? activeColor : inactiveColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
          if (writeIndex >= 0)
            Positioned(
              bottom: bottomInset + _barHeight - _fabSquareSize / 2,
              child: _WriteButton(
                squareSize: _fabSquareSize,
                onTap: () => onTap(writeIndex),
                background: AppNavColors.writeButtonBackground(context),
                foreground: AppNavColors.writeButtonForeground(context),
              ),
            ),
        ],
      ),
    );
  }
}

class _WriteButton extends StatelessWidget {
  const _WriteButton({
    required this.squareSize,
    required this.onTap,
    required this.background,
    required this.foreground,
  });

  final double squareSize;
  final VoidCallback onTap;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: background,
      elevation: 4,
      shadowColor: background.withValues(alpha: 0.4),
      child: InkWell(
        onTap: onTap,
        splashColor: foreground.withValues(alpha: 0.28),
        highlightColor: foreground.withValues(alpha: 0.12),
        child: SizedBox(
          width: squareSize,
          height: squareSize,
          child: Icon(Icons.add_rounded, color: foreground, size: 26),
        ),
      ),
    );
  }
}

class _NavBarBackgroundPainter extends CustomPainter {
  _NavBarBackgroundPainter({
    required this.width,
    required this.barHeight,
    required this.fabCenterX,
    required this.fabHalfWidth,
    required this.backgroundColor,
    required this.shadowColor,
  });

  final double width;
  final double barHeight;
  final double fabCenterX;
  final double fabHalfWidth;
  final Color backgroundColor;
  final Color shadowColor;

  double get _fabLeft => fabCenterX - fabHalfWidth;
  double get _fabRight => fabCenterX + fabHalfWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final topY = size.height - barHeight;
    final path = _buildPath(topY);
    canvas.drawShadow(path, shadowColor, 10, false);
    canvas.drawPath(path, Paint()..color = backgroundColor);
  }

  Path _buildPath(double topY) {
    final path = Path();
    path.moveTo(0, topY + barHeight);
    path.lineTo(0, topY);
    _traceFlatTop(path, topY, fromX: 0, toX: width);
    path.lineTo(width, topY + barHeight);
    path.close();
    return path;
  }

  void _traceFlatTop(Path path, double topY, {required double fromX, required double toX}) {
    if (toX <= _fabLeft || fromX >= _fabRight) {
      path.lineTo(toX, topY);
      return;
    }

    if (fromX < _fabLeft) {
      path.lineTo(_fabLeft, topY);
    }
    path.lineTo(_fabRight, topY);
    if (toX > _fabRight) {
      path.lineTo(toX, topY);
    }
  }

  @override
  bool shouldRepaint(covariant _NavBarBackgroundPainter oldDelegate) {
    return oldDelegate.backgroundColor != backgroundColor ||
        oldDelegate.width != width ||
        oldDelegate.fabHalfWidth != fabHalfWidth;
  }
}
