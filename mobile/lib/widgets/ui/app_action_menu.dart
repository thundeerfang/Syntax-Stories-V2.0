import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import 'app_tappable.dart';

class AppActionMenuItem {
  const AppActionMenuItem({
    required this.id,
    required this.label,
    this.icon,
    this.enabled = true,
    this.destructive = false,
    this.onTap,
  });

  final String id;
  final String label;
  final IconData? icon;
  final bool enabled;
  final bool destructive;
  final VoidCallback? onTap;
}

/// Custom bordered action menu — square corners, uppercase semi-bold rows.
class AppActionMenu extends StatefulWidget {
  const AppActionMenu({
    super.key,
    required this.items,
    this.itemHeight = 40,
    this.minWidth = 196,
    this.alignRight = true,
    this.icon = Icons.more_horiz_rounded,
    this.iconSize = 18,
    this.triggerWidth = 28,
    this.triggerHeight,
    this.triggerDecoration,
    this.triggerIconColor,
    this.rotateTriggerIcon = true,
    this.preferOpenUpward = false,
  });

  final List<AppActionMenuItem> items;
  final double itemHeight;
  final double minWidth;
  final bool alignRight;
  final IconData icon;
  final double iconSize;
  final double triggerWidth;
  final double? triggerHeight;
  final BoxDecoration? triggerDecoration;
  final Color? triggerIconColor;
  final bool rotateTriggerIcon;
  final bool preferOpenUpward;

  @override
  State<AppActionMenu> createState() => _AppActionMenuState();
}

class _AppActionMenuState extends State<AppActionMenu> with SingleTickerProviderStateMixin {
  final _anchorKey = GlobalKey();
  OverlayEntry? _entry;
  late final AnimationController _menuController;
  late final Animation<double> _menuFade;
  late final Animation<double> _menuSlide;
  bool _closing = false;
  bool _opensUpward = false;

  bool get _isOpen => _entry != null;

  @override
  void initState() {
    super.initState();
    _menuController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
      reverseDuration: const Duration(milliseconds: 160),
    );
    final curve = CurvedAnimation(parent: _menuController, curve: Curves.easeOutCubic);
    _menuFade = curve;
    _menuSlide = Tween<double>(begin: -8, end: 0).animate(curve);
  }

  @override
  void reassemble() {
    super.reassemble();
    // Hot reload can leave a stale overlay pointing at removed methods.
    _detachOverlayImmediately();
  }

  @override
  void dispose() {
    _detachOverlayImmediately();
    _menuController.dispose();
    super.dispose();
  }

  void _detachOverlayImmediately() {
    _closing = false;
    _entry?.remove();
    _entry = null;
    if (_menuController.isAnimating) {
      _menuController.stop();
    }
    _menuController.value = 0;
  }

  void _toggle() {
    if (_isOpen) {
      _closeOverlay();
    } else {
      _showOverlay();
    }
  }

  Future<void> _closeOverlay() async {
    if (_entry == null || _closing) return;
    _closing = true;
    try {
      if (_menuController.value > 0) {
        await _menuController.reverse();
      }
      _entry?.remove();
      _entry = null;
      if (mounted) setState(() {});
    } finally {
      _closing = false;
    }
  }

  double _menuPanelHeight() {
    final dividerCount = widget.items.length > 1 ? widget.items.length - 1 : 0;
    return widget.items.length * widget.itemHeight + dividerCount * 2;
  }

  void _showOverlay() {
    final anchorContext = _anchorKey.currentContext;
    if (anchorContext == null) return;

    final overlay = Overlay.of(context, rootOverlay: true);

    final box = anchorContext.findRenderObject()! as RenderBox;
    final offset = box.localToGlobal(Offset.zero);
    final size = box.size;
    final screen = MediaQuery.sizeOf(context);
    final menuWidth = widget.minWidth;
    final menuHeight = _menuPanelHeight();
    const gap = 4.0;

    var left = widget.alignRight ? offset.dx + size.width - menuWidth : offset.dx;
    left = left.clamp(8.0, screen.width - menuWidth - 8);

    final spaceBelow = screen.height - (offset.dy + size.height + gap);
    final openUpward = widget.preferOpenUpward || spaceBelow < menuHeight + 8;
    _opensUpward = openUpward;
    final top = openUpward
        ? offset.dy - menuHeight - gap
        : offset.dy + size.height + gap;

    _menuController.value = 0;
    _entry = OverlayEntry(
      builder: (overlayContext) {
        return AnimatedBuilder(
          animation: _menuController,
          builder: (context, child) {
            return SizedBox.expand(
              child: Stack(
                children: [
                  Positioned.fill(
                    child: GestureDetector(
                      behavior: HitTestBehavior.translucent,
                      onTap: _closeOverlay,
                    ),
                  ),
                  Positioned(
                    left: left,
                    top: top + (_opensUpward ? -_menuSlide.value : _menuSlide.value),
                    width: menuWidth,
                    child: Opacity(
                      opacity: _menuFade.value,
                      child: child,
                    ),
                  ),
                ],
              ),
            );
          },
          child: _buildMenuPanel(overlayContext),
        );
      },
    );

    overlay.insert(_entry!);
    setState(() {});
    _menuController.forward(from: 0);
  }

  Widget _buildMenuPanel(BuildContext context) {
    final colors = context.appColors;

    return Material(
      elevation: 12,
      shadowColor: colors.shadow.withValues(alpha: 0.35),
      color: colors.card,
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border.all(color: colors.border, width: 2),
          color: colors.card,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < widget.items.length; i++) ...[
              if (i > 0)
                Divider(
                  height: 2,
                  thickness: 2,
                  color: colors.border,
                ),
              _AppActionMenuRow(
                item: widget.items[i],
                height: widget.itemHeight,
                onSelected: () async {
                  final item = widget.items[i];
                  if (!item.enabled) return;
                  await _closeOverlay();
                  item.onTap?.call();
                },
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTrigger(BuildContext context) {
    final colors = context.appColors;
    final height = widget.triggerHeight ?? widget.itemHeight;
    final decoration = widget.triggerDecoration ??
        BoxDecoration(
          border: Border.all(color: colors.border, width: 2),
          color: colors.card,
        );
    final iconColor = widget.triggerIconColor ??
        (_isOpen ? colors.primary : colors.mutedForeground);

    return AppTappable(
      onTap: _toggle,
      splashColor: appRippleOnSurface(colors),
      decoration: decoration,
      child: SizedBox(
        width: widget.triggerWidth,
        height: height,
        child: Center(
          child: TweenAnimationBuilder<Color?>(
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOutCubic,
            tween: ColorTween(end: iconColor),
            builder: (context, color, child) {
              final icon = Icon(
                widget.icon,
                size: widget.iconSize,
                color: color,
              );
              if (!widget.rotateTriggerIcon) return icon;
              return AnimatedRotation(
                turns: _isOpen ? 0.25 : 0,
                duration: const Duration(milliseconds: 180),
                curve: Curves.easeOutCubic,
                child: icon,
              );
            },
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return KeyedSubtree(
      key: _anchorKey,
      child: _buildTrigger(context),
    );
  }
}

class _AppActionMenuRow extends StatelessWidget {
  const _AppActionMenuRow({
    required this.item,
    required this.height,
    required this.onSelected,
  });

  final AppActionMenuItem item;
  final double height;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final fg = !item.enabled
        ? colors.mutedForeground
        : item.destructive
            ? colors.destructive
            : colors.foreground;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: item.enabled ? onSelected : null,
        child: SizedBox(
          height: height,
          width: double.infinity,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                if (item.icon != null) ...[
                  Icon(item.icon, size: 16, color: fg),
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: Text(
                    item.label.toUpperCase(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.4,
                      color: fg,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Shared chip label styling for bookmark folder filters.
TextStyle bookmarkChipLabelStyle(
  BuildContext context, {
  required bool active,
}) {
  final colors = context.appColors;
  return GoogleFonts.inter(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    color: active ? colors.primary : colors.foreground,
  );
}
