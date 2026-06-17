import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

import '../../theme/app_color_tokens.dart';

/// Bookmark animation — mirrors webapp `BookmarkLottie`.
class BlogBookmarkLottie extends StatefulWidget {
  const BlogBookmarkLottie({
    super.key,
    this.size = 18,
    this.play = false,
  });

  final double size;
  final bool play;

  @override
  State<BlogBookmarkLottie> createState() => _BlogBookmarkLottieState();
}

class _BlogBookmarkLottieState extends State<BlogBookmarkLottie>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this);
    if (widget.play) {
      _controller.repeat();
    }
  }

  @override
  void didUpdateWidget(covariant BlogBookmarkLottie oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.play && !oldWidget.play) {
      if (_controller.duration != null) {
        _controller.repeat();
      }
    } else if (!widget.play && oldWidget.play) {
      _controller.stop();
      _controller.reset();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: Lottie.asset(
        'assets/lottie/Bookmark.json',
        controller: _controller,
        fit: BoxFit.contain,
        repeat: true,
        onLoaded: (composition) {
          _controller
            ..duration = composition.duration
            ..reset();
          if (widget.play) {
            _controller.repeat();
          }
        },
        errorBuilder: (context, error, stackTrace) {
          return Icon(
            Icons.bookmark_rounded,
            size: widget.size,
            color: colors.primary,
          );
        },
      ),
    );
  }
}
