import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/auth_api.dart';
import '../state/auth_state.dart';
import '../theme/retro_theme.dart';
import '../widgets/retro_panel.dart';
import 'verify_code_screen.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _email = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final auth = context.read<AuthState>();
    try {
      await auth.sendLoginOtp(_email.text);
      if (!mounted) return;
      await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const VerifyCodeScreen(isSignup: false)));
    } on AuthApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    return Scaffold(
      appBar: AppBar(title: const Text('SIGN IN')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: RetroPanel(
              title: 'email otp',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    autocorrect: false,
                    style: TextStyle(color: RetroTheme.glow, fontSize: 22, fontFamily: 'VT323'),
                    decoration: const InputDecoration(labelText: 'EMAIL'),
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) return 'Required';
                      if (!v.contains('@')) return 'Invalid email';
                      return null;
                    },
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: auth.busy ? null : _send,
                    child: auth.busy ? const Text('SENDING...') : const Text('SEND CODE'),
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
