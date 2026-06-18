import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/app_feedback.dart';
import '../../state/auth_state.dart';
import '../../widgets/ui/app_feedback_toast.dart';

/// Shows auth banners (OAuth errors, etc.) on any screen — not only welcome.
class AuthFeedbackListener extends StatefulWidget {
  const AuthFeedbackListener({super.key, required this.child});

  final Widget child;

  @override
  State<AuthFeedbackListener> createState() => _AuthFeedbackListenerState();
}

class _AuthFeedbackListenerState extends State<AuthFeedbackListener> {
  String? _shownBanner;

  void _maybeShowBanner(AuthState auth) {
    final message = auth.authBannerMessage;
    if (message == null) {
      _shownBanner = null;
      return;
    }
    if (message == _shownBanner) return;

    _shownBanner = message;
    final kind = auth.authBannerKind ?? AppFeedbackKind.error;
    switch (kind) {
      case AppFeedbackKind.success:
        AppFeedbackToast.success(context, message);
      case AppFeedbackKind.warning:
        AppFeedbackToast.warning(context, message);
      case AppFeedbackKind.error:
        AppFeedbackToast.error(context, message);
    }
    auth.clearAuthBanner();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final message = auth.authBannerMessage;

    if (message != null && message != _shownBanner) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _maybeShowBanner(context.read<AuthState>());
      });
    } else if (message == null && _shownBanner != null) {
      _shownBanner = null;
    }

    return widget.child;
  }
}
