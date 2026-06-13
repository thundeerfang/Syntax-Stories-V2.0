import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../services/auth_api.dart';
import '../../services/oauth_launcher.dart';
import '../../services/oauth_urls.dart';
import '../../theme/app_color_tokens.dart';

/// Circular icon-only OAuth buttons in a horizontal row.
class AuthOAuthIconRow extends StatelessWidget {
  const AuthOAuthIconRow({
    super.key,
    required this.mode,
    this.referralCode,
    this.disabled = false,
    this.onError,
  });

  final OAuthMode mode;
  final String? referralCode;
  final bool disabled;
  final ValueChanged<String>? onError;

  @override
  Widget build(BuildContext context) {
    final urls = OAuthUrls();
    final icons = OAuthProvider.values.map((provider) {
      final href = mode == OAuthMode.login
          ? urls.login(provider)
          : urls.signup(provider, referralCode: referralCode);
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 5),
        child: AuthOAuthCircleIcon(
          iconAsset: provider.iconAsset,
          disabled: disabled,
          onPressed: disabled
              ? null
              : () async {
                  try {
                    await launchOAuthUrl(href);
                  } on AuthApiException catch (e) {
                    if (!context.mounted) return;
                    onError?.call(e.message);
                  } catch (_) {
                    if (!context.mounted) return;
                    onError?.call(
                      'Could not open the sign-in browser. Install or enable a browser app and try again.',
                    );
                  }
                },
        ),
      );
    }).toList();

    return Center(
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: icons,
        ),
      ),
    );
  }
}

class AuthOAuthCircleIcon extends StatelessWidget {
  const AuthOAuthCircleIcon({
    super.key,
    required this.iconAsset,
    required this.onPressed,
    this.disabled = false,
    this.size = 40,
  });

  final String iconAsset;
  final VoidCallback? onPressed;
  final bool disabled;
  final double size;

  @override
  Widget build(BuildContext context) {
    final enabled = !disabled && onPressed != null;
    return Material(
      color: enabled ? context.appColors.card : context.appColors.muted.withValues(alpha: 0.25),
      shape: CircleBorder(
        side: BorderSide(color: context.appColors.border, width: 2),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: enabled ? onPressed : null,
        customBorder: const CircleBorder(),
        child: SizedBox(
          width: size,
          height: size,
          child: Center(
            child: SvgPicture.asset(
              iconAsset,
              width: size * 0.42,
              height: size * 0.42,
              colorFilter: iconAsset.endsWith('x.svg') || iconAsset.endsWith('github.svg')
                  ? ColorFilter.mode(
                      enabled ? context.appColors.foreground : context.appColors.mutedForeground,
                      BlendMode.srcIn,
                    )
                  : null,
            ),
          ),
        ),
      ),
    );
  }
}

enum OAuthMode { login, signup }
