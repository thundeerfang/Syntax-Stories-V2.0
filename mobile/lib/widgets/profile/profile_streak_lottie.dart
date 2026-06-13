import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

/// Read-streak fire animation — from webapp `StreakFire.lottie` (JSON extract).
class ProfileStreakLottie extends StatelessWidget {
  const ProfileStreakLottie({super.key, this.size = 24});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Lottie.asset(
        'assets/lottie/StreakFire.json',
        fit: BoxFit.contain,
        repeat: true,
        animate: true,
        errorBuilder: (context, error, stackTrace) {
          return Icon(Icons.local_fire_department, size: size * 0.85, color: Colors.orange);
        },
      ),
    );
  }
}
