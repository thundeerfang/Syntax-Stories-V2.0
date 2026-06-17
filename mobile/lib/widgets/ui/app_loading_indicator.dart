import 'dart:math';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:loading_animation_widget/loading_animation_widget.dart';

import '../../theme/app_color_tokens.dart';

/// Developer / coding motivation lines shown under the global loader.
const kAppLoadingQuotes = [
  'First, solve the problem. Then, write the code.',
  'Talk is cheap. Show me the code.',
  'Programs must be written for people to read.',
  'Make it work, make it right, make it fast.',
  'Debugging is like being the detective in a crime movie.',
  'Clean code always looks like it was written by someone who cares.',
  'Simplicity is the soul of efficiency.',
  'The best error message is the one that never shows up.',
  'Ship early, ship often.',
  'Fall seven times, stand up eight — refactor and retry.',
  'Weeks of coding can save you hours of planning.',
  'Syntax is the story; logic is the plot.',
  'Any fool can write code that a computer can understand.',
  'Experience is the name everyone gives to their mistakes.',
  'In software, the hard part isn\'t the code — it\'s the people.',
  'Stay hungry, stay foolish — keep shipping.',
  'Code is poetry written in logic.',
  'The only way to learn a new language is by writing programs in it.',
  'Perfection is achieved not when there is nothing more to add, but nothing left to take away.',
  'You are slow, inaccurate, and brilliant. The computer is the opposite.',
];

/// App-wide loading animation — staggered dots wave.
class AppLoadingIndicator extends StatelessWidget {
  const AppLoadingIndicator({
    super.key,
    this.size = 48,
    this.color,
  });

  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final loaderColor = color ?? context.appColors.primary;
    return LoadingAnimationWidget.staggeredDotsWave(
      color: loaderColor,
      size: size,
    );
  }
}

/// Italic quote caption under the global loader.
class AppLoadingQuoteCaption extends StatelessWidget {
  const AppLoadingQuoteCaption({
    super.key,
    required this.quote,
    this.maxWidth = 280,
  });

  final String quote;
  final double maxWidth;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final textColor = colors.mutedForeground.withValues(alpha: 0.72);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: Text(
          '“$quote”',
          textAlign: TextAlign.center,
          maxLines: 3,
          overflow: TextOverflow.ellipsis,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            fontStyle: FontStyle.italic,
            height: 1.45,
            color: textColor,
          ),
        ),
      ),
    );
  }
}

/// Centered full-area loader used while screens fetch data.
class AppLoadingCenter extends StatefulWidget {
  const AppLoadingCenter({
    super.key,
    this.size = 48,
    this.color,
    this.padding,
    this.showQuote = true,
    this.quote,
  });

  final double size;
  final Color? color;
  final EdgeInsetsGeometry? padding;
  /// Motivational quote under the wave loader (global loaders only).
  final bool showQuote;
  /// Optional fixed quote; otherwise picks one at random when mounted.
  final String? quote;

  @override
  State<AppLoadingCenter> createState() => _AppLoadingCenterState();
}

class _AppLoadingCenterState extends State<AppLoadingCenter> {
  late final String _quote;

  @override
  void initState() {
    super.initState();
    _quote = widget.quote ??
        kAppLoadingQuotes[Random().nextInt(kAppLoadingQuotes.length)];
  }

  @override
  void didUpdateWidget(covariant AppLoadingCenter oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.quote != null && widget.quote != oldWidget.quote) {
      _quote = widget.quote!;
    }
  }

  @override
  Widget build(BuildContext context) {
    final showQuote = widget.showQuote && widget.size >= 40;

    return Center(
      child: Padding(
        padding: widget.padding ?? EdgeInsets.zero,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppLoadingIndicator(size: widget.size, color: widget.color),
            if (showQuote) ...[
              const SizedBox(height: 20),
              AppLoadingQuoteCaption(quote: _quote),
            ],
          ],
        ),
      ),
    );
  }
}
