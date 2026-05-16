import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'screens/auth_gate.dart';
import 'state/auth_state.dart';
import 'theme/retro_theme.dart';

class SyntaxStoriesApp extends StatelessWidget {
  const SyntaxStoriesApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthState()..bootstrap(),
      child: MaterialApp(
        title: 'Syntax Stories',
        debugShowCheckedModeBanner: false,
        theme: RetroTheme.theme(),
        home: const RetroScanlines(child: AuthGate()),
      ),
    );
  }
}
