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
import '../widgets/ui/app_feedback_banner.dart';
import 'verify_code_screen.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _email = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  String? _apiError;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  void _clearApiError() {
    if (_apiError != null) setState(() => _apiError = null);
  }

  void _setApiError(String message) {
    setState(() => _apiError = message);
  }

  Future<void> _send() async {
    _clearApiError();
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final auth = context.read<AuthState>();
    try {
      await auth.sendLoginOtp(_email.text.trim());
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => const VerifyCodeScreen(isSignup: false)),
      );
    } on AuthApiException catch (e) {
      if (!mounted) return;
      _setApiError(e.message);
    } catch (e, st) {
      logApiError('Send login OTP failed', method: 'POST', url: Uri.parse('app://local'), cause: '$e\n$st');
      if (!mounted) return;
      _setApiError(kGenericUserError);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();

    return AuthScreenLayout(
      formKey: _formKey,
      title: 'Sign in',
      subtitle: 'Enter your email address',
      children: [
        AppFeedbackSlot(
          message: _apiError,
          kind: AppFeedbackKind.error,
          onDismiss: _clearApiError,
        ),
        AuthTextField(
          controller: _email,
          label: 'EMAIL ADDRESS',
          rule: AppFieldRule.email,
          keyboardType: TextInputType.emailAddress,
          autocorrect: false,
          onChanged: (_) => _clearApiError(),
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
          mode: OAuthMode.login,
          onError: (msg) => _setApiError(msg),
        ),
      ],
    );
  }
}
