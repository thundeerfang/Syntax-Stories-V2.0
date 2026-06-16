import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';

int blogHeadingLevelFromPayload(Map<String, dynamic> payload) {
  final level = payload['level'];
  if (level == 3 || level == '3') return 3;
  if (level is num && level.toInt() == 3) return 3;
  return 2;
}

/// Public heading block — mirrors webapp `HeadingBlock` (`///` H2 blink, H3 blinking left bar).
class BlogHeadingBlock extends StatelessWidget {
  const BlogHeadingBlock({
    super.key,
    required this.text,
    required this.level,
  });

  final String text;
  final int level;

  @override
  Widget build(BuildContext context) {
    if (level == 3) {
      return _BlogH3Heading(text: text);
    }

    final colors = context.appColors;
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _BlinkingTripleSlash(),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text.toUpperCase(),
              style: GoogleFonts.jetBrainsMono(
                fontSize: 24,
                fontWeight: FontWeight.w900,
                height: 1.1,
                letterSpacing: -0.4,
                color: colors.foreground,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// H3 — blinking `border-l-4 border-primary/50` accent (webapp public heading).
class _BlogH3Heading extends StatelessWidget {
  const _BlogH3Heading({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Padding(
      padding: const EdgeInsets.only(top: 24),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _BlinkingVerticalBar(),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                text,
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  height: 1.25,
                  color: colors.foreground,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BlinkingVerticalBar extends StatefulWidget {
  const _BlinkingVerticalBar();

  @override
  State<_BlinkingVerticalBar> createState() => _BlinkingVerticalBarState();
}

class _BlinkingVerticalBarState extends State<_BlinkingVerticalBar>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return FadeTransition(
      opacity: Tween<double>(begin: 0.35, end: 1).animate(
        CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
      ),
      child: Container(
        width: 4,
        color: primary.withValues(alpha: 0.72),
      ),
    );
  }
}

class _BlinkingTripleSlash extends StatefulWidget {
  const _BlinkingTripleSlash();

  @override
  State<_BlinkingTripleSlash> createState() => _BlinkingTripleSlashState();
}

class _BlinkingTripleSlashState extends State<_BlinkingTripleSlash>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return FadeTransition(
      opacity: Tween<double>(begin: 0.4, end: 1).animate(
        CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
      ),
      child: Text(
        '///',
        style: GoogleFonts.jetBrainsMono(
          fontSize: 22,
          fontWeight: FontWeight.w900,
          color: primary,
        ),
      ),
    );
  }
}
