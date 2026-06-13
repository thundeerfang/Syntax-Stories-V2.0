import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/app_feedback.dart';
import '../services/api_errors.dart';
import '../services/auth_api.dart';
import '../state/auth_state.dart';
import '../utils/field_validation_rules.dart';
import '../widgets/auth/auth_button.dart';
import '../widgets/auth/auth_oauth_icon_row.dart';
import '../widgets/auth/auth_screen_layout.dart';
import '../widgets/auth/auth_text_field.dart';
import '../widgets/auth/auth_ui.dart';
import '../widgets/auth/legal_consent.dart';
import '../widgets/auth/referral_field.dart';
import '../widgets/ui/app_feedback_banner.dart';
import 'verify_code_screen.dart';

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _referral = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  ReferralValidationState _referralState = ReferralValidationState.idle;
  bool _terms = false;
  bool _privacy = false;
  String? _pageMessage;
  AppFeedbackKind _pageMessageKind = AppFeedbackKind.error;
  bool _showLegalError = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _referral.dispose();
    super.dispose();
  }

  String? get _oauthRef => resolvedReferralCode(_referral.text, _referralState);

  void _clearPageMessage() {
    if (_pageMessage != null) setState(() => _pageMessage = null);
  }

  void _setPageError(String message) {
    setState(() {
      _pageMessage = message;
      _pageMessageKind = AppFeedbackKind.error;
    });
  }

  bool _validateSignupRequirements() {
    var ok = true;

    if (!_terms || !_privacy) {
      setState(() {
        _showLegalError = true;
        _pageMessage = !_terms && !_privacy
            ? 'Accept the Terms of Service and Privacy Policy to continue.'
            : !_terms
                ? 'Accept the Terms of Service to continue.'
                : 'Accept the Privacy Policy to continue.';
        _pageMessageKind = AppFeedbackKind.warning;
      });
      ok = false;
    }

    if (referralBlocksSignup(_referral.text, _referralState)) {
      setState(() {
        _pageMessage = _referralState == ReferralValidationState.checking
            ? 'Still verifying referral code…'
            : 'Enter a valid referral code or clear the field.';
        _pageMessageKind = AppFeedbackKind.warning;
      });
      ok = false;
    }

    return ok;
  }

  Future<void> _send() async {
    _clearPageMessage();
    final formOk = _formKey.currentState?.validate() ?? false;
    final requirementsOk = _validateSignupRequirements();
    if (!formOk || !requirementsOk) return;

    final auth = context.read<AuthState>();
    try {
      await auth.sendSignupOtp(
        fullName: _name.text.trim(),
        email: _email.text.trim(),
        referralCode: _oauthRef,
        acceptPolicies: true,
      );
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => const VerifyCodeScreen(isSignup: true)),
      );
    } on AuthApiException catch (e) {
      if (!mounted) return;
      _setPageError(e.message);
    } catch (e, st) {
      logApiError('Send signup OTP failed', method: 'POST', url: Uri.parse('app://local'), cause: '$e\n$st');
      if (!mounted) return;
      _setPageError(kGenericUserError);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final oauthDisabled = !_terms || !_privacy || referralBlocksSignup(_referral.text, _referralState);

    return AuthScreenLayout(
      formKey: _formKey,
      autovalidateMode: AutovalidateMode.onUserInteraction,
      title: 'Sign up',
      subtitle: 'Enter your details below',
      children: [
        AppFeedbackSlot(
          message: _pageMessage,
          kind: _pageMessageKind,
          onDismiss: _clearPageMessage,
        ),
        AuthTextField(
          controller: _name,
          label: 'FULL NAME',
          rule: AppFieldRule.fullNameSignup,
          textCapitalization: TextCapitalization.words,
          onChanged: (_) => _clearPageMessage(),
        ),
        const SizedBox(height: 12),
        AuthTextField(
          controller: _email,
          label: 'EMAIL ADDRESS',
          rule: AppFieldRule.email,
          keyboardType: TextInputType.emailAddress,
          autocorrect: false,
          onChanged: (_) => _clearPageMessage(),
        ),
        const SizedBox(height: 12),
        AuthReferralField(
          controller: _referral,
          disabled: auth.busy,
          onStateChanged: (state, _, _) {
            setState(() => _referralState = state);
            _clearPageMessage();
          },
        ),
        const SizedBox(height: 12),
        AuthLegalConsent(
          termsAccepted: _terms,
          privacyAccepted: _privacy,
          showError: _showLegalError,
          disabled: auth.busy,
          onTermsChanged: (v) {
            setState(() {
              _terms = v;
              _showLegalError = false;
            });
            _clearPageMessage();
          },
          onPrivacyChanged: (v) {
            setState(() {
              _privacy = v;
              _showLegalError = false;
            });
            _clearPageMessage();
          },
        ),
        const SizedBox(height: 16),
        AuthButton(
          label: 'Send code',
          loadingLabel: 'Sending…',
          loading: auth.busy,
          onPressed: auth.busy ? null : _send,
        ),
        const AuthOrDivider(),
        AuthOAuthIconRow(
          mode: OAuthMode.signup,
          referralCode: _oauthRef,
          disabled: oauthDisabled,
          onError: (msg) => setState(() {
            _pageMessage = msg;
            _pageMessageKind = AppFeedbackKind.error;
          }),
        ),
      ],
    );
  }
}
