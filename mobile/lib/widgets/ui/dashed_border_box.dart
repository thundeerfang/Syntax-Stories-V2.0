import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Rectangular box with a dashed stroke — webapp `border-dashed` style.
class DashedBorderBox extends StatelessWidget {
  const DashedBorderBox({
    super.key,
    required this.child,
    this.color,
    this.strokeWidth = 3,
    this.dashLength = 14,
    this.dashGap = 8,
    this.backgroundColor,
    this.padding,
    this.expandWidth = true,
  });

  final Widget child;
  final Color? color;
  final double strokeWidth;
  final double dashLength;
  final double dashGap;
  final Color? backgroundColor;
  final EdgeInsetsGeometry? padding;
  final bool expandWidth;

  @override
  Widget build(BuildContext context) {
    final strokeColor = color ?? Theme.of(context).dividerColor.withValues(alpha: 0.45);

    return CustomPaint(
      painter: _DashedRectPainter(
        color: strokeColor,
        strokeWidth: strokeWidth,
        dashLength: dashLength,
        dashGap: dashGap,
      ),
      child: Container(
        width: expandWidth ? double.infinity : null,
        color: backgroundColor,
        padding: padding,
        child: child,
      ),
    );
  }
}

/// Circular dashed stroke — app bar logo ring.
class DashedBorderCircle extends StatelessWidget {
  const DashedBorderCircle({
    super.key,
    required this.size,
    required this.child,
    this.color,
    this.strokeWidth = 2,
    this.dashLength = 5,
    this.dashGap = 4,
  });

  final double size;
  final Widget child;
  final Color? color;
  final double strokeWidth;
  final double dashLength;
  final double dashGap;

  @override
  Widget build(BuildContext context) {
    final strokeColor = color ?? Theme.of(context).colorScheme.primary;

    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _DashedCirclePainter(
          color: strokeColor,
          strokeWidth: strokeWidth,
          dashLength: dashLength,
          dashGap: dashGap,
        ),
        child: Center(child: child),
      ),
    );
  }
}

class _DashedCirclePainter extends CustomPainter {
  _DashedCirclePainter({
    required this.color,
    required this.strokeWidth,
    required this.dashLength,
    required this.dashGap,
  });

  final Color color;
  final double strokeWidth;
  final double dashLength;
  final double dashGap;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;

    final radius = (math.min(size.width, size.height) - strokeWidth) / 2;
    final center = Offset(size.width / 2, size.height / 2);
    final circumference = 2 * math.pi * radius;
    final dashAngle = (dashLength / circumference) * 2 * math.pi;
    final gapAngle = (dashGap / circumference) * 2 * math.pi;
    var angle = -math.pi / 2;

    while (angle < 3 * math.pi / 2) {
      final end = math.min(angle + dashAngle, 3 * math.pi / 2);
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        angle,
        end - angle,
        false,
        paint,
      );
      angle += dashAngle + gapAngle;
    }
  }

  @override
  bool shouldRepaint(covariant _DashedCirclePainter oldDelegate) {
    return oldDelegate.color != color ||
        oldDelegate.strokeWidth != strokeWidth ||
        oldDelegate.dashLength != dashLength ||
        oldDelegate.dashGap != dashGap;
  }
}

class _DashedRectPainter extends CustomPainter {
  _DashedRectPainter({
    required this.color,
    required this.strokeWidth,
    required this.dashLength,
    required this.dashGap,
  });

  final Color color;
  final double strokeWidth;
  final double dashLength;
  final double dashGap;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;

    final inset = strokeWidth / 2;
    final topLeft = Offset(inset, inset);
    final topRight = Offset(size.width - inset, inset);
    final bottomRight = Offset(size.width - inset, size.height - inset);
    final bottomLeft = Offset(inset, size.height - inset);

    _drawDashedLine(canvas, topLeft, topRight, paint);
    _drawDashedLine(canvas, topRight, bottomRight, paint);
    _drawDashedLine(canvas, bottomRight, bottomLeft, paint);
    _drawDashedLine(canvas, bottomLeft, topLeft, paint);
  }

  void _drawDashedLine(Canvas canvas, Offset start, Offset end, Paint paint) {
    final dx = end.dx - start.dx;
    final dy = end.dy - start.dy;
    final length = math.sqrt(dx * dx + dy * dy);
    if (length <= 0) return;

    final unitX = dx / length;
    final unitY = dy / length;
    final period = dashLength + dashGap;
    var distance = 0.0;

    while (distance < length) {
      final dashEnd = math.min(distance + dashLength, length);
      canvas.drawLine(
        Offset(start.dx + unitX * distance, start.dy + unitY * distance),
        Offset(start.dx + unitX * dashEnd, start.dy + unitY * dashEnd),
        paint,
      );
      distance += period;
    }
  }

  @override
  bool shouldRepaint(covariant _DashedRectPainter oldDelegate) {
    return oldDelegate.color != color ||
        oldDelegate.strokeWidth != strokeWidth ||
        oldDelegate.dashLength != dashLength ||
        oldDelegate.dashGap != dashGap;
  }
}

/// Horizontal dashed rule — blog section divider (not a full block chrome).
class DashedDividerLine extends StatelessWidget {
  const DashedDividerLine({
    super.key,
    this.color,
    this.strokeWidth = 2,
    this.dashLength = 10,
    this.dashGap = 6,
    this.height = 2,
  });

  final Color? color;
  final double strokeWidth;
  final double dashLength;
  final double dashGap;
  final double height;

  @override
  Widget build(BuildContext context) {
    final strokeColor = color ?? Theme.of(context).dividerColor.withValues(alpha: 0.55);
    return SizedBox(
      width: double.infinity,
      height: height,
      child: CustomPaint(
        painter: _DashedHorizontalLinePainter(
          color: strokeColor,
          strokeWidth: strokeWidth,
          dashLength: dashLength,
          dashGap: dashGap,
        ),
      ),
    );
  }
}

class _DashedHorizontalLinePainter extends CustomPainter {
  _DashedHorizontalLinePainter({
    required this.color,
    required this.strokeWidth,
    required this.dashLength,
    required this.dashGap,
  });

  final Color color;
  final double strokeWidth;
  final double dashLength;
  final double dashGap;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;
    final y = size.height / 2;
    _drawDashedSegment(
      canvas,
      Offset(0, y),
      Offset(size.width, y),
      paint,
    );
  }

  void _drawDashedSegment(Canvas canvas, Offset start, Offset end, Paint paint) {
    final dx = end.dx - start.dx;
    final dy = end.dy - start.dy;
    final length = math.sqrt(dx * dx + dy * dy);
    if (length <= 0) return;

    final unitX = dx / length;
    final unitY = dy / length;
    final period = dashLength + dashGap;
    var distance = 0.0;

    while (distance < length) {
      final dashEnd = math.min(distance + dashLength, length);
      canvas.drawLine(
        Offset(start.dx + unitX * distance, start.dy + unitY * distance),
        Offset(start.dx + unitX * dashEnd, start.dy + unitY * dashEnd),
        paint,
      );
      distance += period;
    }
  }

  @override
  bool shouldRepaint(covariant _DashedHorizontalLinePainter oldDelegate) {
    return oldDelegate.color != color ||
        oldDelegate.strokeWidth != strokeWidth ||
        oldDelegate.dashLength != dashLength ||
        oldDelegate.dashGap != dashGap;
  }
}
