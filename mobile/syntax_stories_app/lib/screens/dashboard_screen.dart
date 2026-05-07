import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/auth_state.dart';
import '../theme/retro_theme.dart';
import '../widgets/retro_panel.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final u = auth.user;
    final t = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('DASHBOARD'),
        actions: [
          TextButton(
            onPressed: auth.busy
                ? null
                : () async {
                    await auth.logout();
                  },
            child: const Text('LOGOUT'),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              RetroPanel(
                title: 'operator',
                child: u == null
                    ? Text('NO PROFILE LOADED', style: t.bodyLarge)
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _row('NAME', u.displayName),
                          const SizedBox(height: 8),
                          _row('EMAIL', u.email),
                          if (u.username != null && u.username!.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            _row('USERNAME', u.username!),
                          ],
                          const SizedBox(height: 8),
                          _row('USER ID', u.id),
                        ],
                      ),
              ),
              const SizedBox(height: 20),
              RetroPanel(
                title: 'status',
                accent: RetroTheme.amber,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('> SESSION ACTIVE', style: t.bodyLarge),
                    const SizedBox(height: 8),
                    Text(
                      '// Profile from GET /auth/me',
                      style: t.bodyMedium?.copyWith(fontSize: 16),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static Widget _row(String k, String v) {
    return RichText(
      text: TextSpan(
        style: const TextStyle(fontFamily: 'VT323', fontSize: 22, color: RetroTheme.textMuted),
        children: [
          TextSpan(text: '$k: ', style: const TextStyle(color: RetroTheme.amber)),
          TextSpan(text: v, style: const TextStyle(color: RetroTheme.glow)),
        ],
      ),
    );
  }
}
