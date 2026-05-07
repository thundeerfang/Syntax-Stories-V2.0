import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/auth_state.dart';
import '../theme/retro_theme.dart';
import 'auth_home_screen.dart';
import 'dashboard_screen.dart';

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();

    if (auth.bootstrapping) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(color: RetroTheme.glow),
              SizedBox(height: 16),
              Text('BOOTSTRAPPING...', style: TextStyle(fontFamily: 'VT323', fontSize: 22, color: RetroTheme.glow)),
            ],
          ),
        ),
      );
    }

    if (auth.user != null && auth.accessToken != null) {
      return const DashboardScreen();
    }

    return const AuthHomeScreen();
  }
}
