import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/auth_api.dart';
import '../state/auth_state.dart';
import '../widgets/auth/auth_button.dart';
import '../widgets/auth/auth_screen_layout.dart';
import '../widgets/auth/auth_text_field.dart';
import '../widgets/auth/auth_ui.dart';
import '../widgets/ui/app_feedback_toast.dart';
import 'two_factor_screen.dart';

class VerifyCodeScreen extends StatefulWidget {
  const VerifyCodeScreen({super.key, required this.isSignup});

  final bool isSignup;

  @override
  State<VerifyCodeScreen> createState() => _VerifyCodeScreenState();
}

class _VerifyCodeScreenState extends State<VerifyCodeScreen> {
  final _code = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  int _resendCooldownSec = 0;
  Timer? _resendTimer;

  @override
  void initState() {
    super.initState();
    _resendCooldownSec = 60;
    _startResendCooldown();
  }

  @override
  void dispose() {
    _resendTimer?.cancel();
    _code.dispose();
    super.dispose();
  }

  void _startResendCooldown() {
    _resendTimer?.cancel();
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (_resendCooldownSec <= 0) {
        _resendTimer?.cancel();
        return;
      }
      setState(() => _resendCooldownSec -= 1);
    });
  }

  Future<void> _verify() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final auth = context.read<AuthState>();
    try {
      await auth.submitOtpCode(_code.text.trim());
      if (!mounted) return;
      if (auth.twoFactorChallengeToken != null) {
        await Navigator.of(context).pushReplacement(
          MaterialPageRoute<void>(builder: (_) => const TwoFactorScreen()),
        );
        return;
      }
      Navigator.of(context).popUntil((route) => route.isFirst);
    } on AuthApiException catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(context, e.message);
    }
  }

  Future<void> _resend() async {
    if (_resendCooldownSec > 0) return;
    final auth = context.read<AuthState>();
    try {
      await auth.resendOtp();
      if (!mounted) return;
      setState(() {
        _code.clear();
        _resendCooldownSec = 60;
      });
      _startResendCooldown();
    } on AuthApiException catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(context, e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final canResend = !auth.busy && _resendCooldownSec <= 0;

    return AuthScreenLayout(
      formKey: _formKey,
      appBarTitle: widget.isSignup ? 'Confirm sign up' : 'Confirm sign in',
      header: const AuthVerifyHeader(
        title: 'Enter code',
        subtitle: 'Check your inbox for the verification code',
      ),
      children: [
        AuthInboxCallout(email: auth.pendingEmail ?? '—'),
        const SizedBox(height: 20),
        AuthOtpField(
          controller: _code,
          showLabel: true,
          enabled: !auth.busy,
        ),
        const SizedBox(height: 20),
        AuthButton(
          label: 'Verify',
          loadingLabel: 'Verifying…',
          loading: auth.busy,
          onPressed: auth.busy ? null : _verify,
        ),
        const SizedBox(height: 8),
        Center(
          child: AuthButton(
            label: _resendCooldownSec > 0
                ? 'Resend code in ${_resendCooldownSec}s'
                : 'Resend code',
            variant: AuthButtonVariant.text,
            expand: false,
            onPressed: canResend ? _resend : null,
          ),
        ),
      ],
    );
  }
}
