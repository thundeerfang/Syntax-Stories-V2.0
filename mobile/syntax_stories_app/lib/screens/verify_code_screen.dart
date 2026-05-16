import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/auth_api.dart';
import '../state/auth_state.dart';
import '../theme/retro_theme.dart';
import '../widgets/retro_panel.dart';
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

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final auth = context.read<AuthState>();
    try {
      await auth.submitOtpCode(_code.text);
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
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final email = auth.pendingEmail ?? '—';
    return Scaffold(
      appBar: AppBar(title: Text(widget.isSignup ? 'CONFIRM SIGN UP' : 'CONFIRM SIGN IN')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: RetroPanel(
              title: 'one-time code',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('> SENT TO\n$email', style: Theme.of(context).textTheme.bodyLarge),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _code,
                    keyboardType: TextInputType.number,
                    autocorrect: false,
                    style: TextStyle(color: RetroTheme.glow, fontSize: 28, fontFamily: 'VT323', letterSpacing: 6),
                    decoration: const InputDecoration(labelText: 'CODE'),
                    validator: (v) => (v == null || v.trim().length < 4) ? 'Enter the code' : null,
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: auth.busy ? null : _verify,
                    child: auth.busy ? const Text('VERIFYING...') : const Text('VERIFY'),
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
