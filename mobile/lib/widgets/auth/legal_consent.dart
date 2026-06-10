import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../theme/app_color_tokens.dart';

const _termsUrl = 'https://syntaxstories.com/terms';
const _privacyUrl = 'https://syntaxstories.com/privacy';

class AuthLegalConsent extends StatelessWidget {
  const AuthLegalConsent({
    super.key,
    required this.termsAccepted,
    required this.privacyAccepted,
    required this.onTermsChanged,
    required this.onPrivacyChanged,
    this.disabled = false,
    this.showError = false,
  });

  final bool termsAccepted;
  final bool privacyAccepted;
  final ValueChanged<bool> onTermsChanged;
  final ValueChanged<bool> onPrivacyChanged;
  final bool disabled;
  final bool showError;

  Future<void> _open(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        border: Border.all(
          color: showError ? context.appColors.destructive : context.appColors.border.withValues(alpha: 0.2),
          width: showError ? 2 : 1,
        ),
        color: context.appColors.background.withValues(alpha: 0.15),
      ),
      child: Column(
        children: [
          _row(
            context,
            value: termsAccepted,
            onChanged: onTermsChanged,
            text: 'I accept the ',
            linkLabel: 'Terms of Service',
            url: _termsUrl,
          ),
          const SizedBox(height: 4),
          _row(
            context,
            value: privacyAccepted,
            onChanged: onPrivacyChanged,
            text: 'I accept the ',
            linkLabel: 'Privacy Policy',
            url: _privacyUrl,
          ),
        ],
      ),
    );
  }

  Widget _row(
    BuildContext context, {
    required bool value,
    required ValueChanged<bool> onChanged,
    required String text,
    required String linkLabel,
    required String url,
  }) {
    final colors = context.appColors;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        SizedBox(
          height: 28,
          width: 28,
          child: Checkbox(
            value: value,
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            visualDensity: VisualDensity.compact,
            onChanged: disabled ? null : (v) => onChanged(v ?? false),
          ),
        ),
        const SizedBox(width: 4),
        Expanded(
          child: Text.rich(
            TextSpan(
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: colors.mutedForeground,
                height: 1.2,
              ),
              children: [
                TextSpan(text: text),
                TextSpan(
                  text: linkLabel,
                  style: TextStyle(
                    color: colors.foreground,
                    decoration: TextDecoration.underline,
                    decorationColor: colors.primary,
                  ),
                  recognizer: TapGestureRecognizer()..onTap = () => _open(url),
                ),
                const TextSpan(text: '.'),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
