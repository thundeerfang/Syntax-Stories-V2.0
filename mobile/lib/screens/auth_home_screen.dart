import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/app_feedback.dart';
import '../state/auth_state.dart';
import '../theme/app_color_tokens.dart';
import '../widgets/auth/auth_button.dart';
import '../widgets/auth/auth_ui.dart';
import '../widgets/ui/app_feedback_toast.dart';
import 'sign_in_screen.dart';
import 'sign_up_screen.dart';

class AuthHomeScreen extends StatefulWidget {
  const AuthHomeScreen({super.key});

  @override
  State<AuthHomeScreen> createState() => _AuthHomeScreenState();
}

class _AuthHomeScreenState extends State<AuthHomeScreen> {
  String? _shownBanner;

  void _maybeShowAuthBanner(AuthState auth) {
    final message = auth.authBannerMessage;
    if (message == null) {
      if (_shownBanner != null) {
        setState(() => _shownBanner = null);
      }
      return;
    }
    if (message == _shownBanner) return;

    _shownBanner = message;
    final kind = auth.authBannerKind ?? AppFeedbackKind.error;
    switch (kind) {
      case AppFeedbackKind.success:
        AppFeedbackToast.success(context, message);
      case AppFeedbackKind.warning:
        AppFeedbackToast.warning(context, message);
      case AppFeedbackKind.error:
        AppFeedbackToast.error(context, message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final colors = context.appColors;
    final bannerMessage = auth.authBannerMessage;

    if (bannerMessage != null && bannerMessage != _shownBanner) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _maybeShowAuthBanner(context.read<AuthState>());
      });
    } else if (bannerMessage == null && _shownBanner != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        setState(() => _shownBanner = null);
      });
    }

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
                    context.read<AuthState>().clearAuthBanner();
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
                    context.read<AuthState>().clearAuthBanner();
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
