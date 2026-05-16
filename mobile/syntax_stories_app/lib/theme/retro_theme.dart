import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// CRT / terminal-inspired palette and shapes.
class RetroTheme {
  static const Color bg = Color(0xFF0D0D0D);
  static const Color surface = Color(0xFF1A1A12);
  static const Color border = Color(0xFF33FF66);
  static const Color glow = Color(0xFF39FF14);
  static const Color dimGreen = Color(0xFF1F5C2E);
  static const Color amber = Color(0xFFFFB000);
  static const Color textMuted = Color(0xFF8AE68A);

  static ThemeData theme() {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: bg,
      colorScheme: const ColorScheme.dark(
        primary: glow,
        onPrimary: bg,
        secondary: amber,
        onSecondary: bg,
        surface: surface,
        onSurface: glow,
        error: Color(0xFFFF3366),
        onError: Colors.white,
      ),
    );

    final vt = GoogleFonts.vt323TextTheme(base.textTheme).apply(
      bodyColor: glow,
      displayColor: glow,
    );

    return base.copyWith(
      textTheme: vt.copyWith(
        headlineLarge: vt.headlineLarge?.copyWith(fontSize: 36, letterSpacing: 1.2),
        headlineMedium: vt.headlineMedium?.copyWith(fontSize: 28, letterSpacing: 1),
        titleLarge: vt.titleLarge?.copyWith(fontSize: 26, letterSpacing: 0.8),
        bodyLarge: vt.bodyLarge?.copyWith(fontSize: 22, height: 1.2),
        bodyMedium: vt.bodyMedium?.copyWith(fontSize: 20, height: 1.25, color: textMuted),
        labelLarge: vt.labelLarge?.copyWith(fontSize: 20, letterSpacing: 2, fontWeight: FontWeight.w600),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: surface,
        foregroundColor: glow,
        elevation: 0,
        titleTextStyle: GoogleFonts.vt323(fontSize: 24, color: glow, letterSpacing: 1),
        iconTheme: const IconThemeData(color: glow),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF0A140A),
        border: _retroBorder(),
        enabledBorder: _retroBorder(),
        focusedBorder: _retroBorder(width: 2.5, color: amber),
        errorBorder: _retroBorder(color: const Color(0xFFFF3366)),
        focusedErrorBorder: _retroBorder(width: 2.5, color: const Color(0xFFFF3366)),
        labelStyle: GoogleFonts.vt323(color: textMuted, fontSize: 18),
        hintStyle: GoogleFonts.vt323(color: dimGreen, fontSize: 18),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: dimGreen,
          foregroundColor: glow,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.zero,
            side: const BorderSide(color: border, width: 2),
          ),
          textStyle: GoogleFonts.vt323(fontSize: 22, letterSpacing: 2),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: amber,
          textStyle: GoogleFonts.vt323(fontSize: 18, letterSpacing: 1),
        ),
      ),
    );
  }

  static OutlineInputBorder _retroBorder({double width = 2, Color color = border}) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.zero,
      borderSide: BorderSide(color: color, width: width),
    );
  }
}

/// Subtle horizontal scanline overlay for CRT feel.
class RetroScanlines extends StatelessWidget {
  const RetroScanlines({super.key, this.child});

  final Widget? child;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        ?child,
        IgnorePointer(
          child: CustomPaint(
            painter: _ScanlinePainter(),
          ),
        ),
      ],
    );
  }
}

class _ScanlinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()..color = Colors.black.withValues(alpha: 0.12);
    for (double y = 0; y < size.height; y += 3) {
      canvas.drawRect(Rect.fromLTWH(0, y, size.width, 1), p);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
