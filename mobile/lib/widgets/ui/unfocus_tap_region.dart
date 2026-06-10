import 'package:flutter/material.dart';

/// Wrap text inputs so taps outside dismiss focus and hide the keyboard.
class UnfocusTapRegion extends StatelessWidget {
  const UnfocusTapRegion({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return TapRegion(
      onTapOutside: (_) => FocusManager.instance.primaryFocus?.unfocus(),
      child: child,
    );
  }
}
