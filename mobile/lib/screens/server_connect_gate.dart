import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../config/api_config.dart';
import '../services/server_connect_api.dart';
import '../theme/app_color_tokens.dart';
import '../widgets/ui/app_loading_indicator.dart';

/// Blocks the app until `GET /api/health` succeeds (handles Render cold start).
class ServerConnectGate extends StatefulWidget {
  const ServerConnectGate({super.key, required this.child});

  final Widget child;

  @override
  State<ServerConnectGate> createState() => _ServerConnectGateState();
}

class _ServerConnectGateState extends State<ServerConnectGate> {
  final _api = ServerConnectApi();

  bool _connected = false;
  bool _failed = false;
  int _attempt = 0;
  int _maxAttempts = 0;

  @override
  void initState() {
    super.initState();
    _connect();
  }

  Future<void> _connect() async {
    setState(() {
      _connected = false;
      _failed = false;
      _attempt = 0;
    });

    final local = isLocalApiBaseUrl(_api.baseUrl);
    final maxAttempts = local ? 12 : 90;
    final interval = local ? const Duration(seconds: 1) : const Duration(seconds: 2);

    final ok = await _api.waitUntilReady(
      maxAttempts: maxAttempts,
      interval: interval,
      onAttempt: (attempt, max) {
        if (!mounted) return;
        setState(() {
          _attempt = attempt;
          _maxAttempts = max;
        });
      },
    );

    if (!mounted) return;
    setState(() {
      _connected = ok;
      _failed = !ok;
    });
  }

  String get _statusMessage {
    if (_failed) return 'Could not reach the server.';
    if (_attempt <= 1) return 'Connecting to server…';
    if (isLocalApiBaseUrl(_api.baseUrl)) {
      return 'Waiting for local API…';
    }
    if (_attempt < 4) return 'Connecting to server…';
    return 'Waking up API — free tier can take a minute…';
  }

  @override
  Widget build(BuildContext context) {
    if (_connected) return widget.child;

    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final host = Uri.tryParse(_api.baseUrl)?.host ?? _api.baseUrl;

    return Scaffold(
      backgroundColor: colors.background,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Image.asset(
                  'assets/favicon.png',
                  width: 56,
                  height: 56,
                  fit: BoxFit.contain,
                ),
                const SizedBox(height: 28),
                AppLoadingIndicator(size: 44, color: primary),
                const SizedBox(height: 20),
                Text(
                  _statusMessage.toUpperCase(),
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.8,
                    color: colors.foreground,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  host,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: colors.mutedForeground,
                  ),
                ),
                if (_attempt > 0 && !_failed) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Attempt $_attempt${_maxAttempts > 0 ? ' / $_maxAttempts' : ''}',
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: colors.mutedForeground.withValues(alpha: 0.75),
                    ),
                  ),
                ],
                if (_failed) ...[
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _connect,
                    child: Text(
                      'TRY AGAIN',
                      style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w900),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
