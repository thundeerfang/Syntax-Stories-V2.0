import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

/// Fire animation — from webapp `public/lottie/Fire.lottie`.
class HomeFireLottie extends StatelessWidget {
  const HomeFireLottie({super.key, this.size = 20});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Lottie.asset(
        'assets/lottie/Fire.json',
        fit: BoxFit.contain,
        repeat: true,
        animate: true,
        errorBuilder: (context, error, stackTrace) {
          return Icon(Icons.local_fire_department, size: size * 0.9, color: Colors.orange);
        },
      ),
    );
  }
}
