import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/push_notification_service.dart';
import '../../state/auth_state.dart';
import '../../state/notification_state.dart';

/// Binds auth + realtime SSE + optional system push registration.
class NotificationRealtimeBridge extends StatefulWidget {
  const NotificationRealtimeBridge({super.key, required this.child});

  final Widget child;

  @override
  State<NotificationRealtimeBridge> createState() => _NotificationRealtimeBridgeState();
}

class _NotificationRealtimeBridgeState extends State<NotificationRealtimeBridge> {
  final _push = PushNotificationService();
  bool _pushAttempted = false;
  bool _pushReady = false;
  String? _boundToken;

  Future<bool> _ensurePush() async {
    if (_pushAttempted) return _pushReady;
    _pushAttempted = true;
    _pushReady = await _push.initialize();
    return _pushReady;
  }

  void _syncAuth(AuthState auth, NotificationState notif) {
    final token = auth.accessToken;
    notif.bindAccessToken(token);
    if (_boundToken == token) return;
    _boundToken = token;

    if (token == null || token.isEmpty) return;

    unawaited(() async {
      final ready = await _ensurePush();
      if (!ready || !mounted) return;
      await _push.registerWithServer(token);
    }());
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final notif = context.read<NotificationState>();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _syncAuth(auth, notif);
    });
    return widget.child;
  }
}
