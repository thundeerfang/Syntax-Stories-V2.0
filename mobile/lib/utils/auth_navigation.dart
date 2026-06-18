import 'package:flutter/material.dart';

/// Clears pushed routes after sign-out so auth home is visible (not settings underneath).
void popToAppRoot(BuildContext context) {
  Navigator.of(context).popUntil((route) => route.isFirst);
}
