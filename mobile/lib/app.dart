import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'screens/auth_gate.dart';
import 'screens/server_connect_gate.dart';
import 'screens/two_factor_screen.dart';
import 'services/api_errors.dart';
import 'services/auth_api.dart';
import 'services/oauth_deep_link.dart';
import 'state/auth_state.dart';
import 'state/notification_state.dart';
import 'theme/app_theme.dart';
import 'theme/theme_controller.dart';
import 'utils/auth_navigation.dart';
import 'widgets/auth/auth_feedback_listener.dart';
import 'widgets/auth/auth_oauth_flow_overlay.dart';
import 'widgets/notifications/notification_realtime_bridge.dart';

class SyntaxStoriesApp extends StatefulWidget {
  const SyntaxStoriesApp({super.key});

  @override
  State<SyntaxStoriesApp> createState() => _SyntaxStoriesAppState();
}

class _SyntaxStoriesAppState extends State<SyntaxStoriesApp>
    with WidgetsBindingObserver {
  final _appLinks = AppLinks();
  final _navigatorKey = GlobalKey<NavigatorState>();

  static const _oauthTimeout = Duration(minutes: 3);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initDeepLinks();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;
    final auth = _navigatorKey.currentContext?.read<AuthState>();
    if (auth == null || !auth.oauthPending || auth.oauthExchanging) return;

    final started = auth.oauthStartedAt;
    if (started != null && DateTime.now().difference(started) > _oauthTimeout) {
      auth.failOAuth('Sign-in timed out. Please try again.');
      return;
    }
    if (started == null ||
        DateTime.now().difference(started) < const Duration(seconds: 2)) {
      return;
    }
    Future<void>.delayed(const Duration(milliseconds: 700), () {
      final latest = _auth;
      if (latest == null || !latest.oauthPending || latest.oauthExchanging) {
        return;
      }
      latest.failOAuth('Sign-in cancelled. Please try again.');
    });
  }

  Future<void> _initDeepLinks() async {
    final initial = await _appLinks.getInitialLink();
    if (initial != null) _handleOAuthUri(initial);

    _appLinks.uriLinkStream.listen(_handleOAuthUri);
  }

  AuthState? get _auth {
    final ctx = _navigatorKey.currentContext;
    if (ctx == null) return null;
    return ctx.read<AuthState>();
  }

  void _resetAuthNavigation() {
    final ctx = _navigatorKey.currentContext;
    if (ctx != null) popToAppRoot(ctx);
  }

  Future<void> _handleOAuthUri(Uri uri) async {
    if (!OAuthDeepLink.isAppLink(uri)) return;

    final auth = _auth;
    if (auth == null) return;

    final error = OAuthDeepLink.errorMessage(uri);
    if (error != null) {
      logApiError(
        'OAuth callback error',
        method: 'GET',
        url: uri,
        cause: error,
      );
      auth.failOAuth(error);
      return;
    }

    final challenge = OAuthDeepLink.twoFactorChallenge(uri);
    if (challenge != null) {
      auth.clearOAuthPending();
      auth.setTwoFactorChallenge(challenge);
      _resetAuthNavigation();
      _navigatorKey.currentState?.push(
        MaterialPageRoute<void>(builder: (_) => const TwoFactorScreen()),
      );
      return;
    }

    final code = OAuthDeepLink.exchangeCode(uri);
    if (code == null) return;

    auth.markOAuthExchanging();
    try {
      await auth.completeOAuthExchange(code);
      if (!mounted) return;
      _resetAuthNavigation();
      if (auth.twoFactorChallengeToken != null) {
        _navigatorKey.currentState?.push(
          MaterialPageRoute<void>(builder: (_) => const TwoFactorScreen()),
        );
      }
    } on AuthApiException catch (e) {
      auth.failOAuth(e.message);
    } catch (e) {
      logApiError(
        'OAuth exchange',
        method: 'POST',
        url: Uri.parse('syntaxstories://oauth'),
        cause: e,
      );
      auth.failOAuth(kGenericUserError);
    }
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthState()..bootstrap()),
        ChangeNotifierProvider(create: (_) => ThemeController()),
        ChangeNotifierProvider(create: (_) => NotificationState()),
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
            builder: (context, child) {
              return AuthFeedbackListener(
                child: Stack(children: [?child, const AuthOAuthFlowOverlay()]),
              );
            },
            home: const ServerConnectGate(
              child: NotificationRealtimeBridge(child: AuthGate()),
            ),
          );
        },
      ),
    );
  }
}
