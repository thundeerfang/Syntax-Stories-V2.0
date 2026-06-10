import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'models/app_feedback.dart';
import 'screens/auth_gate.dart';
import 'screens/two_factor_screen.dart';
import 'services/api_errors.dart';
import 'services/auth_api.dart';
import 'state/auth_state.dart';
import 'theme/app_theme.dart';
import 'theme/theme_controller.dart';

class SyntaxStoriesApp extends StatefulWidget {
  const SyntaxStoriesApp({super.key});

  @override
  State<SyntaxStoriesApp> createState() => _SyntaxStoriesAppState();
}

class _SyntaxStoriesAppState extends State<SyntaxStoriesApp> {
  final _appLinks = AppLinks();
  final _navigatorKey = GlobalKey<NavigatorState>();

  @override
  void initState() {
    super.initState();
    _initDeepLinks();
  }

  Future<void> _initDeepLinks() async {
    final initial = await _appLinks.getInitialLink();
    if (initial != null) _handleOAuthUri(initial);

    _appLinks.uriLinkStream.listen(_handleOAuthUri);
  }

  void _handleOAuthUri(Uri uri) {
    if (uri.scheme != 'syntaxstories' || uri.host != 'app') return;
    if (!uri.path.contains('/auth/callback/')) return;

    final auth = _navigatorKey.currentContext?.read<AuthState>();
    if (auth == null) return;

    final error = uri.queryParameters['error'];
    if (error != null && error.isNotEmpty) {
      logApiError(
        'OAuth callback error',
        method: 'GET',
        url: uri,
        cause: error,
      );
      auth.setAuthBanner(kGenericUserError, AppFeedbackKind.error);
      return;
    }

    final twoFactor = uri.queryParameters['twoFactorRequired'];
    final challenge = uri.queryParameters['challengeToken'];
    if (twoFactor == '1' && challenge != null && challenge.isNotEmpty) {
      auth.setTwoFactorChallenge(challenge);
      _navigatorKey.currentState?.push(
        MaterialPageRoute<void>(builder: (_) => const TwoFactorScreen()),
      );
      return;
    }

    final code = uri.queryParameters['code'];
    if (code == null || code.isEmpty) return;

    auth.completeOAuthExchange(code).then((_) {
      if (auth.twoFactorChallengeToken != null) {
        _navigatorKey.currentState?.push(
          MaterialPageRoute<void>(builder: (_) => const TwoFactorScreen()),
        );
      }
    }).catchError((Object e) {
      if (e is AuthApiException) {
        auth.setAuthBanner(e.message, AppFeedbackKind.error);
      } else {
        logApiError('OAuth exchange', method: 'POST', url: Uri.parse('syntaxstories://oauth'), cause: e);
        auth.setAuthBanner(kGenericUserError, AppFeedbackKind.error);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthState()..bootstrap()),
        ChangeNotifierProvider(create: (_) => ThemeController()),
      ],
      child: Consumer<ThemeController>(
        builder: (context, theme, _) {
          return MaterialApp(
            navigatorKey: _navigatorKey,
            title: 'Syntax Stories',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.light(),
            darkTheme: AppTheme.dark(),
            themeMode: theme.mode,
            home: const AuthGate(),
          );
        },
      ),
    );
  }
}
