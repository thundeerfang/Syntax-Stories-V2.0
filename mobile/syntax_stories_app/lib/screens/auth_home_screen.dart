import 'package:flutter/material.dart';

import '../theme/retro_theme.dart';
import '../widgets/retro_panel.dart';
import 'sign_in_screen.dart';
import 'sign_up_screen.dart';

class AuthHomeScreen extends StatelessWidget {
  const AuthHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 12),
              Text(
                'SYNTAX STORIES',
                textAlign: TextAlign.center,
                style: t.headlineLarge?.copyWith(
                  color: RetroTheme.glow,
                  shadows: [
                    Shadow(color: RetroTheme.glow.withValues(alpha: 0.45), blurRadius: 18),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'MOBILE TERMINAL v1.0',
                textAlign: TextAlign.center,
                style: t.bodyMedium,
              ),
              const SizedBox(height: 28),
              RetroPanel(
                title: 'session',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      '> AWAITING CREDENTIALS',
                      style: t.bodyLarge,
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: () {
                        Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const SignInScreen()));
                      },
                      child: const Text('SIGN IN'),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: () {
                        Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const SignUpScreen()));
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: RetroTheme.amber,
                        side: const BorderSide(color: RetroTheme.amber, width: 2),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                        textStyle: Theme.of(context).textTheme.labelLarge?.copyWith(color: RetroTheme.amber),
                      ),
                      child: const Text('CREATE ACCOUNT'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Text(
                '// Uses server OTP auth: /auth/send-otp · /auth/signup-email · /auth/verify-otp',
                style: t.bodyMedium?.copyWith(fontSize: 16, color: RetroTheme.dimGreen),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
