import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

/// GitHub connect mascot — from webapp `public/lottie/icons8-github.json`.
class GithubConnectLottie extends StatelessWidget {
  const GithubConnectLottie({super.key, this.size = 120});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Lottie.asset(
        'assets/lottie/icons8-github.json',
        fit: BoxFit.contain,
        repeat: true,
        animate: true,
        errorBuilder: (context, error, stackTrace) {
          return Icon(Icons.code, size: size * 0.55);
        },
      ),
    );
  }
}
