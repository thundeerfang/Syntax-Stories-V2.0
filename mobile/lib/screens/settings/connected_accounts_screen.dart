import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/auth_api.dart';
import '../../services/oauth_launcher.dart';
import '../../services/oauth_urls.dart';
import '../../state/auth_state.dart';
import '../../utils/auth_navigation.dart';
import '../../utils/connected_accounts.dart';
import '../../utils/user_message_case.dart';
import '../../widgets/connected_accounts/connected_account_card.dart';
import '../../widgets/settings/settings_inventory_header.dart';
import '../../widgets/settings/settings_section_scaffold.dart';
import '../../widgets/ui/app_confirm_dialog.dart';
import '../../widgets/ui/app_feedback_toast.dart';

class ConnectedAccountsScreen extends StatefulWidget {
  const ConnectedAccountsScreen({super.key});

  @override
  State<ConnectedAccountsScreen> createState() => _ConnectedAccountsScreenState();
}

class _ConnectedAccountsScreenState extends State<ConnectedAccountsScreen> {
  final _api = AuthApi();
  String? _busyProviderId;

  Future<void> _pullRefresh() async {
    await context.read<AuthState>().refreshUser();
  }

  Future<void> _connect(OAuthProvider provider) async {
    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      AppFeedbackToast.error(context, 'Not signed in.');
      return;
    }

    setState(() => _busyProviderId = provider.name);

    try {
      final redirectUrl = await _api.getLinkRedirectUrl(
        accessToken: token,
        provider: provider.name,
      );
      await launchOAuthUrl(OAuthUrls.withMobileReturnOrigin(redirectUrl));
      if (!mounted) return;
      setState(() => _busyProviderId = null);
      AppFeedbackToast.warning(
        context,
        'Complete linking in your browser, then return to the app.',
      );
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() => _busyProviderId = null);
      AppFeedbackToast.error(context, formatUserMessage(e.message));
    } catch (_) {
      if (!mounted) return;
      setState(() => _busyProviderId = null);
      AppFeedbackToast.error(context, 'Could not start linking.');
    }
  }

  Future<void> _disconnect(OAuthProvider provider, String title) async {
    final confirmed = await AppConfirmDialog.show(
      context,
      title: 'Disconnect account?',
      message: 'Unlinking $title will log you out everywhere. Continue?',
      confirmLabel: 'Disconnect',
      cancelLabel: 'Cancel',
    );
    if (confirmed != true || !mounted) return;

    final auth = context.read<AuthState>();
    final token = auth.accessToken;
    if (token == null || token.isEmpty) {
      AppFeedbackToast.error(context, 'Not signed in.');
      return;
    }

    setState(() => _busyProviderId = provider.name);

    try {
      await _api.disconnectProvider(accessToken: token, provider: provider.name);
      if (!mounted) return;
      AppFeedbackToast.success(context, 'Connection removed. Logging out…');
      await Future<void>.delayed(const Duration(milliseconds: 900));
      if (!mounted) return;
      await auth.logout();
      if (!mounted) return;
      popToAppRoot(context);
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() => _busyProviderId = null);
      AppFeedbackToast.error(context, formatUserMessage(e.message));
    } catch (_) {
      if (!mounted) return;
      setState(() => _busyProviderId = null);
      AppFeedbackToast.error(context, 'Could not disconnect.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    final linkedCount = user == null ? 0 : countLinkedConnectedProviders(user);

    return SettingsSectionScaffold(
      title: 'Connected accounts',
      description: 'Manage external sign-in\nproviders linked to your account.',
      icon: Icons.link_rounded,
      iconOnPrimary: true,
      headerStyle: SettingsSectionHeaderStyle.centeredPlain,
      showHeaderTitle: false,
      onRefresh: _pullRefresh,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SettingsInventoryHeader(
            title: 'LINKED PROVIDERS',
            count: linkedCount,
            max: kConnectedAccountProviders.length,
          ),
          const SizedBox(height: 10),
          ConnectedAccountCardList(
            children: [
              for (final row in kConnectedAccountProviders)
                ConnectedAccountCard(
                  provider: row.provider,
                  title: row.title,
                  linked: user != null && connectedProviderIsLinked(row.provider, user),
                  busy: _busyProviderId == row.provider.name,
                  onConnect: () => _connect(row.provider),
                  onDisconnect: () => _disconnect(row.provider, row.title),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
