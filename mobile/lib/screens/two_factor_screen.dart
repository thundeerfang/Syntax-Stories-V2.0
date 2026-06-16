import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/auth_api.dart';
import '../state/auth_state.dart';
import '../utils/field_validation_rules.dart';
import '../widgets/auth/auth_button.dart';
import '../widgets/auth/auth_screen_layout.dart';
import '../widgets/auth/auth_text_field.dart';
import '../widgets/auth/auth_ui.dart';
import '../widgets/ui/app_feedback_toast.dart';

class TwoFactorScreen extends StatefulWidget {
  const TwoFactorScreen({super.key});

  @override
  State<TwoFactorScreen> createState() => _TwoFactorScreenState();
}

class _TwoFactorScreenState extends State<TwoFactorScreen> {
  final _token = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _token.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final auth = context.read<AuthState>();
    try {
      await auth.submitTwoFactor(_token.text.trim());
      if (!mounted) return;
      Navigator.of(context).popUntil((route) => route.isFirst);
    } on AuthApiException catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(context, e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();

    return AuthScreenLayout(
      formKey: _formKey,
      appBarTitle: 'Two-factor auth',
      header: const AuthVerifyHeader(
        title: 'Authenticator code',
        subtitle: 'Enter the 6-digit code from your authenticator app.',
      ),
      children: [
        AuthOtpField(
          controller: _token,
          label: '6-DIGIT CODE',
          rule: AppFieldRule.totp,
          enabled: !auth.busy,
        ),
        const SizedBox(height: 20),
        AuthButton(
          label: 'Unlock',
          loadingLabel: 'Verifying…',
          loading: auth.busy,
          onPressed: auth.busy ? null : _submit,
        ),
      ],
    );
  }
}
