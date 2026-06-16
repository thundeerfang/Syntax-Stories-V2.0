import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../widgets/ui/app_loading_indicator.dart';
import '../state/auth_state.dart';
import '../theme/app_color_tokens.dart';
import 'auth_home_screen.dart';
import 'main_shell.dart';

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();

    if (auth.bootstrapping) {
      final colors = context.appColors;
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AppLoadingIndicator(color: colors.primary),
              const SizedBox(height: 16),
              const Text('Loading…'),
            ],
          ),
        ),
      );
    }

    if (auth.user != null && auth.accessToken != null) {
      return const MainShell();
    }

    return const AuthHomeScreen();
  }
}
