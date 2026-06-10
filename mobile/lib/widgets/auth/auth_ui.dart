import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';

/// Uppercase italic display style for auth step titles (SIGN_IN, SIGN_UP, …).
String formatAuthLabel(String text) {
  return text
      .trim()
      .replaceAll(RegExp(r'[\s\-]+'), '_')
      .replaceAll(RegExp(r'_+'), '_')
      .replaceAll(RegExp(r'^_|_$'), '')
      .toUpperCase();
}

TextStyle authTitleStyle(BuildContext context, {double fontSize = 22}) {
  return GoogleFonts.inter(
    fontSize: fontSize,
    fontWeight: FontWeight.w900,
    fontStyle: FontStyle.italic,
    letterSpacing: 1.4,
    height: 1.15,
    color: context.appColors.foreground,
  );
}

TextStyle authSubtitleStyle(BuildContext context) {
  return GoogleFonts.inter(
    fontSize: 13,
    fontWeight: FontWeight.w500,
    color: context.appColors.mutedForeground,
  );
}

/// Shared auth sub-screen header — back button + optional uppercase title.
class AuthScreenAppBar extends StatelessWidget implements PreferredSizeWidget {
  const AuthScreenAppBar({super.key, this.title, this.onBack});

  final String? title;
  final VoidCallback? onBack;

  static TextStyle appBarTitleStyle(BuildContext context) {
    final base = Theme.of(context).appBarTheme.titleTextStyle;
    return GoogleFonts.inter(
      fontSize: base?.fontSize ?? 12,
      fontWeight: FontWeight.w900,
      fontStyle: FontStyle.italic,
      letterSpacing: 1.6,
      color: base?.color ?? context.appColors.foreground,
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
        tooltip: 'Back',
        onPressed: onBack ?? () => Navigator.of(context).pop(),
      ),
      title: title == null
          ? null
          : Text(formatAuthLabel(title!), style: appBarTitleStyle(context)),
    );
  }
}

class AuthCard extends StatelessWidget {
  const AuthCard({super.key, required this.child, this.title});

  final Widget child;
  final String? title;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: context.appColors.card,
        border: Border.all(
          color: context.appColors.border.withValues(alpha: 0.9),
          width: 2,
        ),
        boxShadow: [
          BoxShadow(
            color: context.appColors.shadow,
            offset: Offset(2, 2),
            blurRadius: 0,
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (title != null) ...[
              Text(
                title!.toUpperCase(),
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 2,
                  color: context.appColors.mutedForeground,
                ),
              ),
              const SizedBox(height: 12),
              Divider(
                color: context.appColors.border.withValues(alpha: 0.35),
                height: 1,
              ),
              const SizedBox(height: 16),
            ],
            child,
          ],
        ),
      ),
    );
  }
}

class AuthFormHeader extends StatelessWidget {
  const AuthFormHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.logoSize = 48,
    this.showLogo = true,
  });

  final String title;
  final String? subtitle;
  final double logoSize;
  final bool showLogo;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showLogo) ...[
          Align(
            alignment: Alignment.centerLeft,
            child: Image.asset(
              'assets/logo.png',
              width: logoSize,
              height: logoSize,
            ),
          ),
          const SizedBox(height: 12),
        ],
        AuthStepHeader(title: title, subtitle: subtitle),
      ],
    );
  }
}

class AuthHero extends StatelessWidget {
  const AuthHero({
    super.key,
    this.subtitle,
    this.light = false,
    this.logoSize = 72,
  });

  final String? subtitle;

  /// Light text/logo treatment for primary gradient backgrounds.
  final bool light;
  final double logoSize;

  @override
  Widget build(BuildContext context) {
    final titleColor = light ? Colors.white : context.appColors.foreground;
    final subtitleColor = light
        ? Colors.white.withValues(alpha: 0.82)
        : context.appColors.mutedForeground;

    return Column(
      children: [
        DecoratedBox(
          decoration: light
              ? BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.12),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.28),
                    width: 2,
                  ),
                )
              : const BoxDecoration(),
          child: Padding(
            padding: light ? const EdgeInsets.all(10) : EdgeInsets.zero,
            child: Image.asset(
              'assets/logo.png',
              width: logoSize,
              height: logoSize,
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          'SYNTAX STORIES',
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(
            fontSize: 24,
            fontWeight: FontWeight.w900,
            fontStyle: FontStyle.italic,
            letterSpacing: 2.2,
            height: 1.1,
            color: titleColor,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 10),
          Text(
            subtitle!,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              height: 1.45,
              color: subtitleColor,
            ),
          ),
        ],
      ],
    );
  }
}

class AuthOrDivider extends StatelessWidget {
  const AuthOrDivider({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(
        children: [
          Expanded(
            child: Divider(color: context.appColors.border.withValues(alpha: 0.35)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(
              'OR',
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 2,
                color: context.appColors.mutedForeground,
              ),
            ),
          ),
          Expanded(
            child: Divider(color: context.appColors.border.withValues(alpha: 0.35)),
          ),
        ],
      ),
    );
  }
}

class AuthStepHeader extends StatelessWidget {
  const AuthStepHeader({super.key, required this.title, this.subtitle});

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(formatAuthLabel(title), style: authTitleStyle(context)),
        if (subtitle != null) ...[
          const SizedBox(height: 6),
          Text(subtitle!, style: authSubtitleStyle(context)),
        ],
      ],
    );
  }
}

/// Lock icon + title for OTP verify step (left-aligned, no card wrapper).
class AuthVerifyHeader extends StatelessWidget {
  const AuthVerifyHeader({super.key, required this.title, this.subtitle});

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 40,
          height: 40,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: context.appColors.muted.withValues(alpha: 0.35),
            border: Border.all(
              color: context.appColors.primary.withValues(alpha: 0.45),
              width: 2,
            ),
          ),
          child: Icon(
            Icons.lock_outline,
            size: 20,
            color: context.appColors.primary,
          ),
        ),
        const SizedBox(height: 12),
        AuthStepHeader(title: title, subtitle: subtitle),
      ],
    );
  }
}

class AuthInboxCallout extends StatelessWidget {
  const AuthInboxCallout({super.key, required this.email});

  final String email;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: context.appColors.muted.withValues(alpha: 0.25),
        border: Border.all(color: context.appColors.border.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'SENT TO',
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.4,
              color: context.appColors.mutedForeground,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            email,
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: context.appColors.foreground,
            ),
          ),
        ],
      ),
    );
  }
}

class AuthFooterLink extends StatelessWidget {
  const AuthFooterLink({
    super.key,
    required this.prompt,
    required this.actionLabel,
    required this.onTap,
  });

  final String prompt;
  final String actionLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 20),
      child: Text.rich(
        textAlign: TextAlign.center,
        TextSpan(
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.2,
            color: context.appColors.mutedForeground,
          ),
          children: [
            TextSpan(text: '$prompt '),
            WidgetSpan(
              alignment: PlaceholderAlignment.baseline,
              baseline: TextBaseline.alphabetic,
              child: GestureDetector(
                onTap: onTap,
                child: Text(
                  actionLabel,
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                    color: context.appColors.foreground,
                    decoration: TextDecoration.underline,
                    decorationColor: context.appColors.primary.withValues(alpha: 0.5),
                    decorationThickness: 2,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Shared auth footer copyright — welcome, sign-in, sign-up, verify, 2FA, etc.
class AuthCopyrightFooter extends StatelessWidget {
  const AuthCopyrightFooter({
    super.key,
    this.light = false,
    this.padding = const EdgeInsets.only(top: 24, bottom: 8),
  });

  /// Light text for primary gradient / hero backgrounds.
  final bool light;
  final EdgeInsets padding;

  static String notice([int? year]) {
    final y = year ?? DateTime.now().year;
    return '© $y Syntax Stories. All rights reserved.';
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final textColor = light
        ? Colors.white.withValues(alpha: 0.72)
        : colors.mutedForeground.withValues(alpha: 0.85);

    return Padding(
      padding: padding,
      child: Text(
        notice(),
        textAlign: TextAlign.center,
        style: GoogleFonts.inter(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.4,
          height: 1.35,
          color: textColor,
        ),
      ),
    );
  }
}
