import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../ui/app_loading_indicator.dart';

/// Blocks interaction while OAuth runs in the system browser or token exchange.
class AuthOAuthFlowOverlay extends StatelessWidget {
  const AuthOAuthFlowOverlay({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    if (!auth.oauthPending && !auth.oauthExchanging) return const SizedBox.shrink();

    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final label = auth.oauthExchanging
        ? 'Signing you in…'
        : 'Continue in your browser…';

    return Positioned.fill(
      child: AbsorbPointer(
        child: ColoredBox(
          color: colors.background.withValues(alpha: 0.88),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AppLoadingIndicator(size: 44, color: primary),
                  const SizedBox(height: 20),
                  Text(
                    label.toUpperCase(),
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.8,
                      color: colors.foreground,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    auth.oauthExchanging
                        ? 'Fetching your account'
                        : 'Return here after you finish in the browser',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: colors.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
