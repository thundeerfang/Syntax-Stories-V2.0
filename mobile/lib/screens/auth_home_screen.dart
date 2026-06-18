import 'package:flutter/material.dart';

import '../theme/app_color_tokens.dart';
import '../widgets/auth/auth_button.dart';
import '../widgets/auth/auth_ui.dart';
import 'sign_in_screen.dart';
import 'sign_up_screen.dart';

class AuthHomeScreen extends StatelessWidget {
  const AuthHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Scaffold(
      backgroundColor: colors.primary,
      body: DecoratedBox(
        decoration: BoxDecoration(gradient: colors.welcomeGradient),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            child: Column(
              children: [
                const Spacer(flex: 2),
                const AuthHero(
                  light: true,
                  subtitle: 'Sign in to continue reading and writing.',
                ),
                const Spacer(flex: 3),
                AuthButton(
                  label: 'Sign in',
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const SignInScreen(),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 12),
                AuthButton(
                  label: 'Sign up',
                  variant: AuthButtonVariant.frost,
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const SignUpScreen(),
                      ),
                    );
                  },
                ),
                const Spacer(),
                const AuthCopyrightFooter(
                  light: true,
                  padding: EdgeInsets.only(top: 8, bottom: 0),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
