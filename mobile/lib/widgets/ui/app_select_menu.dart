import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import 'app_tappable.dart';

class AppSelectOption {
  const AppSelectOption({
    required this.value,
    required this.label,
    this.icon,
    this.destructive = false,
  });

  final String value;
  final String label;
  final IconData? icon;
  final bool destructive;
}

/// Custom bordered select — square corners, overlay list, animated chevron.
class AppSelectMenu extends StatefulWidget {
  const AppSelectMenu({
    super.key,
    required this.value,
    required this.options,
    required this.onChanged,
    this.height = 42,
    this.minWidth = 112,
    this.menuMinWidth,
    this.alignMenuRight = true,
    this.triggerIcon,
    this.triggerIconColor,
    this.triggerDecoration,
    this.allowReselect = false,
  });

  final String value;
  final List<AppSelectOption> options;
  final ValueChanged<String> onChanged;
  final double height;
  final double minWidth;
  final double? menuMinWidth;
  final bool alignMenuRight;
  final IconData? triggerIcon;
  final Color? triggerIconColor;
  final BoxDecoration? triggerDecoration;
  final bool allowReselect;

  @override
  State<AppSelectMenu> createState() => _AppSelectMenuState();
}

class _AppSelectMenuState extends State<AppSelectMenu> with SingleTickerProviderStateMixin {
  final _anchorKey = GlobalKey();
  OverlayEntry? _entry;
  late final AnimationController _menuController;
  late final Animation<double> _menuFade;
  late final Animation<double> _menuSlide;
  bool _closing = false;

  bool get _isOpen => _entry != null;

  AppSelectOption get _selected =>
      widget.options.firstWhere(
        (o) => o.value == widget.value,
        orElse: () => widget.options.first,
      );

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

  void _showOverlay() {
    final anchorContext = _anchorKey.currentContext;
    final overlay = Overlay.maybeOf(context, rootOverlay: true);
    if (anchorContext == null || overlay == null) return;

    final box = anchorContext.findRenderObject()! as RenderBox;
    final offset = box.localToGlobal(Offset.zero);
    final size = box.size;
    final screen = MediaQuery.sizeOf(context);
    final menuWidth = widget.triggerIcon != null
        ? (widget.menuMinWidth ?? 180)
        : (size.width < widget.minWidth ? widget.minWidth : size.width);

    var left = widget.alignMenuRight ? offset.dx + size.width - menuWidth : offset.dx;
    final top = offset.dy + size.height + 4;
    left = left.clamp(8.0, screen.width - menuWidth - 8);

    _menuController.value = 0;
    _entry = OverlayEntry(
      builder: (context) {
        return AnimatedBuilder(
          animation: _menuController,
          builder: (context, child) {
            return Stack(
              children: [
                Positioned.fill(
                  child: GestureDetector(
                    behavior: HitTestBehavior.translucent,
                    onTap: _closeOverlay,
                  ),
                ),
                Positioned(
                  left: left,
                  top: top + _menuSlide.value,
                  width: menuWidth,
                  child: Opacity(
                    opacity: _menuFade.value,
                    child: child,
                  ),
                ),
              ],
            );
          },
          child: _buildMenuPanel(context, menuWidth),
        );
      },
    );

    overlay.insert(_entry!);
    setState(() {});
    _menuController.forward(from: 0);
  }

  Widget _buildMenuPanel(BuildContext context, double width) {
    final colors = context.appColors;

    return Material(
      color: colors.card,
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border.all(color: colors.border, width: 2),
          color: colors.card,
          boxShadow: [
            BoxShadow(
              color: colors.shadow.withValues(alpha: 0.35),
              offset: const Offset(3, 3),
              blurRadius: 0,
            ),
          ],
        ),
        child: SizedBox(
          width: width,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (var i = 0; i < widget.options.length; i++) ...[
                if (i > 0)
                  Divider(
                    height: 2,
                    thickness: 2,
                    color: colors.border,
                  ),
                _SelectMenuRow(
                  label: widget.options[i].label,
                  icon: widget.options[i].icon,
                  destructive: widget.options[i].destructive,
                  selected: !widget.allowReselect && widget.options[i].value == widget.value,
                  height: widget.height,
                  onTap: () async {
                    final next = widget.options[i].value;
                    await _closeOverlay();
                    if (widget.allowReselect || next != widget.value) widget.onChanged(next);
                  },
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTrigger(BuildContext context) {
    final colors = context.appColors;

    if (widget.triggerIcon != null) {
      final decoration = widget.triggerDecoration ??
          BoxDecoration(
            border: Border.all(color: colors.border, width: 2),
            color: colors.card,
          );
      final iconColor = widget.triggerIconColor ??
          (_isOpen ? colors.primary : colors.foreground);

      return AppTappable(
        onTap: _toggle,
        splashColor: appRippleOnSurface(colors),
        decoration: decoration,
        child: SizedBox(
          height: widget.height,
          width: widget.height,
          child: Icon(widget.triggerIcon, size: 22, color: iconColor),
        ),
      );
    }

    return ConstrainedBox(
      constraints: BoxConstraints(minWidth: widget.minWidth),
      child: AppTappable(
        onTap: _toggle,
        color: colors.card,
        splashColor: appRippleOnSurface(colors),
        decoration: widget.triggerDecoration ??
            BoxDecoration(
              border: Border.all(color: colors.border, width: 2),
              color: colors.card,
            ),
        padding: const EdgeInsets.symmetric(horizontal: 10),
        child: SizedBox(
          height: widget.height,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _selected.label.toUpperCase(),
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: _isOpen ? colors.primary : colors.foreground,
                ),
              ),
              const SizedBox(width: 6),
              TweenAnimationBuilder<Color?>(
                duration: const Duration(milliseconds: 180),
                curve: Curves.easeOutCubic,
                tween: ColorTween(
                  end: _isOpen ? colors.primary : colors.mutedForeground,
                ),
                builder: (context, color, child) {
                  return AnimatedRotation(
                    turns: _isOpen ? 0.5 : 0,
                    duration: const Duration(milliseconds: 180),
                    curve: Curves.easeOutCubic,
                    child: Icon(
                      Icons.expand_more_rounded,
                      size: 18,
                      color: color,
                    ),
                  );
                },
              ),
            ],
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

class _SelectMenuRow extends StatelessWidget {
  const _SelectMenuRow({
    required this.label,
    required this.selected,
    required this.height,
    required this.onTap,
    this.icon,
    this.destructive = false,
  });

  final String label;
  final IconData? icon;
  final bool destructive;
  final bool selected;
  final double height;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final fg = destructive
        ? colors.destructive
        : selected
            ? colors.primary
            : colors.foreground;

    return Material(
      color: selected ? colors.primary.withValues(alpha: 0.1) : Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: SizedBox(
          height: height,
          width: double.infinity,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 16, color: fg),
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: Text(
                    label.toUpperCase(),
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
