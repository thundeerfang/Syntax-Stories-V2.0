import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

import '../../theme/app_color_tokens.dart';

/// Respect spark animation — from webapp `Spark.lottie` (JSON extract).
class ProfileRespectLottie extends StatelessWidget {
  const ProfileRespectLottie({super.key, this.size = 24});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Lottie.asset(
        'assets/lottie/Spark.json',
        fit: BoxFit.contain,
        repeat: true,
        animate: true,
        errorBuilder: (context, error, stackTrace) {
          return Icon(Icons.bolt_rounded, size: size * 0.85, color: context.appColors.primary);
        },
      ),
    );
  }
}
