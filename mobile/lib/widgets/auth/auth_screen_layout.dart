import 'package:flutter/material.dart';

import 'auth_ui.dart';

/// Shared horizontal / bottom insets for all auth shells (welcome + sub-screens).
abstract final class AuthShellInsets {
  static const double horizontal = 24;
  static const double scrollTop = 16;
  static const double scrollBottom = 16;
  static const double footerBottom = 24;
}

/// Shared auth sub-screen shell: back bar, scroll body, copyright pinned at bottom.
class AuthScreenLayout extends StatelessWidget {
  const AuthScreenLayout({
    super.key,
    this.appBarTitle,
    this.onBack,
    this.title,
    this.subtitle,
    this.header,
    this.showLogo = true,
    this.showCopyright = true,
    this.formKey,
    this.autovalidateMode,
    required this.children,
  });

  final String? appBarTitle;
  final VoidCallback? onBack;
  final String? title;
  final String? subtitle;
  final Widget? header;
  final bool showLogo;
  final bool showCopyright;
  final GlobalKey<FormState>? formKey;
  final AutovalidateMode? autovalidateMode;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final headerWidget = header ??
        (title != null
            ? AuthFormHeader(
                title: title!,
                subtitle: subtitle,
                showLogo: showLogo,
              )
            : null);

    Widget scrollBody = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (headerWidget != null) ...[
          headerWidget,
          const SizedBox(height: 20),
        ],
        ...children,
      ],
    );

    if (formKey != null) {
      scrollBody = Form(
        key: formKey,
        autovalidateMode: autovalidateMode,
        child: scrollBody,
      );
    }

    return Scaffold(
      appBar: AuthScreenAppBar(title: appBarTitle, onBack: onBack),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(
                  AuthShellInsets.horizontal,
                  AuthShellInsets.scrollTop,
                  AuthShellInsets.horizontal,
                  AuthShellInsets.scrollBottom,
                ),
                child: scrollBody,
              ),
            ),
            if (showCopyright) const AuthShellCopyrightSlot(),
          ],
        ),
      ),
    );
  }
}

/// Copyright pinned to the bottom of auth screens — same slot as welcome hero.
class AuthShellCopyrightSlot extends StatelessWidget {
  const AuthShellCopyrightSlot({super.key, this.light = false});

  final bool light;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AuthShellInsets.horizontal,
        0,
        AuthShellInsets.horizontal,
        AuthShellInsets.footerBottom,
      ),
      child: AuthCopyrightFooter(
        light: light,
        padding: const EdgeInsets.only(top: 8, bottom: 0),
      ),
    );
  }
}
