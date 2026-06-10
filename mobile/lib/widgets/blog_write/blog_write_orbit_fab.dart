import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/blog_block.dart';
import '../../theme/app_color_tokens.dart';
import 'blog_write_toolbar.dart';

/// Bottom-right square FAB — tap to fan block chips in an orbital arc (right → left).
class BlogWriteOrbitFab extends StatefulWidget {
  const BlogWriteOrbitFab({
    super.key,
    required this.onAddBlock,
    this.blockCount = 0,
  });

  final ValueChanged<String> onAddBlock;
  final int blockCount;

  @override
  State<BlogWriteOrbitFab> createState() => _BlogWriteOrbitFabState();
}

class _BlogWriteOrbitFabState extends State<BlogWriteOrbitFab> with SingleTickerProviderStateMixin {
  static const _fabSize = 52.0;
  static const _orbitRadius = 136.0;
  static const _chipSize = 50.0;
  static const _chipIconSize = 22.0;

  late final AnimationController _controller;
  late final Animation<double> _expand;

  bool get _open => _controller.value > 0.5;
  bool get _atLimit => widget.blockCount >= blogMaxBlocksPerSection;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 280));
    _expand = CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic, reverseCurve: Curves.easeInCubic);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _toggle() {
    if (_open) {
      _controller.reverse();
    } else {
      _controller.forward();
    }
  }

  void _close() {
    if (_open) _controller.reverse();
  }

  void _pickBlock(String type) {
    if (_atLimit) return;
    widget.onAddBlock(type);
    _close();
  }

  /// Upper semicircle arc: right (0 rad) → top → left (−π rad).
  Offset _orbitOffset(int index, int total) {
    const start = 0.0;
    const end = -math.pi;
    final t = total <= 1 ? 0.5 : index / (total - 1);
    final angle = start + (end - start) * t;
    return Offset(math.cos(angle) * _orbitRadius, math.sin(angle) * _orbitRadius);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final items = blogWriteToolbarItems;
    final bottom = MediaQuery.paddingOf(context).bottom;

    return AnimatedBuilder(
      animation: _expand,
      builder: (context, child) {
        final progress = _expand.value;
        return Stack(
          clipBehavior: Clip.none,
          children: [
            if (progress > 0)
              Positioned.fill(
                child: GestureDetector(
                  onTap: _close,
                  behavior: HitTestBehavior.opaque,
                  child: Container(
                    color: colors.background.withValues(alpha: 0.55 * progress),
                  ),
                ),
              ),
            Positioned(
              right: 20,
              bottom: 20 + bottom,
              width: _fabSize + _orbitRadius + _chipSize,
              height: _fabSize + _orbitRadius + _chipSize,
              child: Stack(
                clipBehavior: Clip.none,
                alignment: Alignment.bottomRight,
                children: [
                  for (var i = 0; i < items.length; i++)
                    _OrbitChip(
                      item: items[i],
                      size: _chipSize,
                      iconSize: _chipIconSize,
                      offset: _orbitOffset(i, items.length) * progress,
                      scale: progress,
                      opacity: progress,
                      disabled: _atLimit,
                      onTap: () => _pickBlock(items[i].type),
                    ),
                  _MainFab(
                    size: _fabSize,
                    open: _open,
                    progress: progress,
                    onTap: _toggle,
                  ),
                ],
              ),
            ),
            if (_atLimit && progress > 0.8)
              Positioned(
                right: 20,
                bottom: 84 + bottom,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: colors.card,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: colors.border),
                  ),
                  child: Text(
                    'Max $blogMaxBlocksPerSection blocks',
                    style: GoogleFonts.inter(fontSize: 11, color: colors.mutedForeground),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _OrbitChip extends StatelessWidget {
  const _OrbitChip({
    required this.item,
    required this.size,
    required this.iconSize,
    required this.offset,
    required this.scale,
    required this.opacity,
    required this.onTap,
    this.disabled = false,
  });

  final BlogWriteToolbarItem item;
  final double size;
  final double iconSize;
  final Offset offset;
  final double scale;
  final double opacity;
  final VoidCallback onTap;
  final bool disabled;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Positioned(
      right: 0,
      bottom: 0,
      child: Transform.translate(
        offset: Offset(offset.dx, offset.dy),
        child: Transform.scale(
          scale: scale.clamp(0.0, 1.0),
          child: Opacity(
            opacity: opacity.clamp(0.0, 1.0),
            child: Material(
              color: colors.card,
              shape: const CircleBorder(),
              elevation: 3,
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: disabled ? null : onTap,
                child: SizedBox(
                  width: size,
                  height: size,
                  child: Center(
                    child: item.iconAsset != null
                        ? SvgPicture.asset(
                            item.iconAsset!,
                            width: iconSize,
                            height: iconSize,
                            colorFilter: ColorFilter.mode(
                              disabled ? colors.mutedForeground : colors.foreground,
                              BlendMode.srcIn,
                            ),
                          )
                        : Icon(
                            item.icon,
                            size: iconSize,
                            color: disabled ? colors.mutedForeground : colors.foreground,
                          ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _MainFab extends StatelessWidget {
  const _MainFab({
    required this.size,
    required this.open,
    required this.progress,
    required this.onTap,
  });

  final double size;
  final bool open;
  final double progress;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Material(
      color: colors.primary,
      borderRadius: BorderRadius.zero,
      elevation: 4 + (4 * progress),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.zero,
        child: SizedBox(
          width: size,
          height: size,
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 180),
            transitionBuilder: (child, animation) => RotationTransition(
              turns: Tween<double>(begin: 0.75, end: 1).animate(animation),
              child: FadeTransition(opacity: animation, child: child),
            ),
            child: Icon(
              open ? Icons.close_rounded : Icons.add_rounded,
              key: ValueKey<bool>(open),
              color: colors.primaryForeground,
              size: 26,
            ),
          ),
        ),
      ),
    );
  }
}
