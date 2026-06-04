import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/auth_api.dart';
import '../state/auth_state.dart';
import '../theme/retro_theme.dart';
import '../widgets/retro_panel.dart';

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
      await auth.submitTwoFactor(_token.text);
      if (!mounted) return;
      Navigator.of(context).popUntil((route) => route.isFirst);
    } on AuthApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    return Scaffold(
      appBar: AppBar(title: const Text('2FA')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: RetroPanel(
              title: 'authenticator',
              accent: RetroTheme.amber,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    '> ENTER TOTP FROM YOUR APP',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _token,
                    keyboardType: TextInputType.number,
                    autocorrect: false,
                    style: TextStyle(color: RetroTheme.glow, fontSize: 28, fontFamily: 'VT323', letterSpacing: 4),
                    decoration: const InputDecoration(labelText: '6-DIGIT CODE'),
                    validator: (v) => (v == null || v.trim().length < 6) ? 'Enter code' : null,
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: auth.busy ? null : _submit,
                    child: auth.busy ? const Text('...') : const Text('UNLOCK'),
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
