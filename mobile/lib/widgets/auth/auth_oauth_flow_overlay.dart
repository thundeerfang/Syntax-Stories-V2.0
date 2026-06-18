import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../ui/app_loading_indicator.dart';
import '../ui/app_form_dialog.dart';

/// Blocks interaction while OAuth runs in the system browser or token exchange.
class AuthOAuthFlowOverlay extends StatelessWidget {
  const AuthOAuthFlowOverlay({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    if (!auth.oauthPending && !auth.oauthExchanging) {
      return const SizedBox.shrink();
    }

    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final label = auth.oauthExchanging ? 'Signing you in…' : 'Complete sign-in';

    return Positioned.fill(
      child: ColoredBox(
        color: colors.background.withValues(alpha: 0.88),
        child: Center(
          child: AppFormDialog(
            title: label,
            showActions: false,
            showCloseButton: !auth.oauthExchanging,
            cancelLabel: 'Cancel sign-in',
            submitting: auth.oauthExchanging,
            onCancel: () {
              auth.failOAuth('Sign-in cancelled. Please try again.');
            },
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AppLoadingIndicator(size: 44, color: primary),
                const SizedBox(height: 18),
                Text(
                  auth.oauthExchanging
                      ? 'Fetching your account'
                      : 'Finish the provider step, then return here.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    height: 1.35,
                    color: colors.mutedForeground,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
