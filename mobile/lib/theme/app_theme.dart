import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_color_tokens.dart';

class AppTheme {
  static ThemeData light() => _build(AppColorTokens.light, Brightness.light);

  static ThemeData dark() => _build(AppColorTokens.dark, Brightness.dark);

  static ThemeData _build(AppColorTokens tokens, Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    final scheme = isDark
        ? ColorScheme.dark(
            primary: tokens.primary,
            onPrimary: tokens.primaryForeground,
            secondary: tokens.border,
            onSecondary: tokens.foreground,
            surface: tokens.card,
            onSurface: tokens.foreground,
            error: tokens.destructive,
            onError: tokens.primaryForeground,
          )
        : ColorScheme.light(
            primary: tokens.primary,
            onPrimary: tokens.primaryForeground,
            secondary: tokens.border,
            onSecondary: tokens.background,
            surface: tokens.card,
            onSurface: tokens.foreground,
            error: tokens.destructive,
            onError: tokens.primaryForeground,
          );

    final base = ThemeData(
      useMaterial3: true,
      brightness: brightness,
      scaffoldBackgroundColor: tokens.background,
      colorScheme: scheme,
      extensions: [tokens],
    );

    final text = GoogleFonts.interTextTheme(base.textTheme).apply(
      bodyColor: tokens.foreground,
      displayColor: tokens.foreground,
    );

    return base.copyWith(
      splashFactory: InkRipple.splashFactory,
      textTheme: text,
      appBarTheme: AppBarTheme(
        backgroundColor: tokens.background,
        foregroundColor: tokens.foreground,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: GoogleFonts.inter(
          fontSize: 16,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.8,
          color: tokens.foreground,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: tokens.inputFill,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        border: _inputBorder(tokens),
        enabledBorder: _inputBorder(tokens),
        focusedBorder: _inputBorder(tokens, color: tokens.primary, width: 2),
        errorBorder: _inputBorder(tokens, color: tokens.destructive),
        focusedErrorBorder: _inputBorder(tokens, color: tokens.destructive, width: 2),
        errorStyle: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: tokens.destructive,
          height: 1.25,
        ),
        errorMaxLines: 2,
        labelStyle: GoogleFonts.inter(
          fontSize: 10,
          fontWeight: FontWeight.w900,
          letterSpacing: 1.6,
          color: tokens.mutedForeground,
        ),
        hintStyle: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: tokens.mutedForeground.withValues(alpha: 0.55),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: tokens.primary,
          foregroundColor: tokens.primaryForeground,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
          textStyle: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.4,
          ),
        ).copyWith(
          overlayColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.pressed)) {
              return tokens.primaryForeground.withValues(alpha: 0.22);
            }
            if (states.contains(WidgetState.hovered) || states.contains(WidgetState.focused)) {
              return tokens.primaryForeground.withValues(alpha: 0.1);
            }
            return null;
          }),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: tokens.foreground,
          backgroundColor: tokens.card,
          side: BorderSide(color: tokens.border.withValues(alpha: 0.9), width: 2),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
          textStyle: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.4,
          ),
        ).copyWith(
          overlayColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.pressed)) {
              return tokens.primary.withValues(alpha: 0.16);
            }
            if (states.contains(WidgetState.hovered) || states.contains(WidgetState.focused)) {
              return tokens.primary.withValues(alpha: 0.08);
            }
            return null;
          }),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: ButtonStyle(
          foregroundColor: WidgetStatePropertyAll(tokens.foreground),
          overlayColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.pressed)) {
              return tokens.primary.withValues(alpha: 0.14);
            }
            return null;
          }),
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: ButtonStyle(
          splashFactory: InkRipple.splashFactory,
          overlayColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.pressed)) {
              return tokens.primary.withValues(alpha: 0.16);
            }
            return null;
          }),
        ),
      ),
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return tokens.primary;
          return tokens.card;
        }),
        side: BorderSide(color: tokens.border.withValues(alpha: 0.9), width: 2),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(2)),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: tokens.foreground,
        contentTextStyle: GoogleFonts.inter(
          color: isDark ? tokens.background : tokens.primaryForeground,
          fontSize: 14,
        ),
        behavior: SnackBarBehavior.floating,
      ),
      dividerColor: tokens.border.withValues(alpha: 0.35),
    );
  }

  static OutlineInputBorder _inputBorder(
    AppColorTokens tokens, {
    Color? color,
    double width = 2,
  }) {
    final c = color ?? tokens.border;
    return OutlineInputBorder(
      borderRadius: BorderRadius.zero,
      borderSide: BorderSide(color: c.withValues(alpha: 0.9), width: width),
    );
  }
}
