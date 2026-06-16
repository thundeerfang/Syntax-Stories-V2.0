import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/notification_preferences.dart';
import '../../services/api_errors.dart';
import '../../services/auth_api.dart';
import '../../services/notifications_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/notification_pref_config.dart';
import '../../utils/user_message_case.dart';
import '../../widgets/notifications/notification_pref_tile.dart';
import '../../widgets/settings/settings_section_scaffold.dart';
import '../../widgets/ui/app_feedback_toast.dart';
import '../../widgets/ui/app_loading_indicator.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  static const _savedMessage = 'Preference saved.';

  final _api = NotificationsApi();
  NotificationPreferences? _prefs;
  bool _loading = true;
  String? _savingKey;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) {
        setState(() {
          _loading = false;
          _prefs = null;
        });
      }
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final prefs = await _api.fetchPreferences(token);
      if (!mounted) return;
      setState(() {
        _prefs = prefs;
        _loading = false;
      });
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = formatUserMessage(e.message);
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = formatUserMessage(kGenericUserError);
      });
    }
  }

  Future<void> _pullRefresh() async {
    await _loadPreferences();
  }

  Future<void> _patchPref(String key, bool value) async {
    final token = context.read<AuthState>().accessToken;
    final prefs = _prefs;
    if (token == null || token.isEmpty || prefs == null || _savingKey != null) return;

    final previous = prefs;
    setState(() {
      _savingKey = key;
      _prefs = prefs.withKey(key, value);
    });

    try {
      final updated = await _api.updatePreferences(token, {key: value});
      if (!mounted) return;
      setState(() {
        _prefs = updated;
        _savingKey = null;
      });
      AppFeedbackToast.success(context, _savedMessage);
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _prefs = previous;
        _savingKey = null;
      });
      AppFeedbackToast.error(context, formatUserMessage(e.message));
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _prefs = previous;
        _savingKey = null;
      });
      AppFeedbackToast.error(context, formatUserMessage(kGenericUserError));
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final prefs = _prefs;
    final inAppOn = prefs?.inAppEnabled ?? true;
    final saving = _savingKey != null;

    return SettingsSectionScaffold(
      title: 'Notifications',
      description:
          'Choose what shows in your bell inbox.\nControl live alerts while you are signed in.',
      icon: Icons.notifications_none_rounded,
      iconOnPrimary: true,
      headerStyle: SettingsSectionHeaderStyle.centeredPlain,
      showHeaderTitle: false,
      onRefresh: _pullRefresh,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_loading && prefs == null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 32),
              child: AppLoadingCenter(color: colors.primary),
            )
          else if (prefs == null)
            Text(
              _error ?? 'Could not load notification preferences.',
              style: GoogleFonts.inter(fontSize: 13, color: colors.destructive),
            )
          else ...[
            NotificationPrefTile(
              item: notificationMasterPref,
              value: inAppOn,
              disabled: saving && _savingKey != notificationPrefKeyInApp,
              saving: _savingKey == notificationPrefKeyInApp,
              onChanged: (value) => _patchPref(notificationPrefKeyInApp, value),
            ),
            const SizedBox(height: 20),
            Text(
              'ALERT CATEGORIES',
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.2,
                color: colors.mutedForeground,
              ),
            ),
            const SizedBox(height: 10),
            for (var i = 0; i < notificationCategoryPrefs.length; i++) ...[
              if (i > 0) const SizedBox(height: 10),
              NotificationPrefTile(
                item: notificationCategoryPrefs[i],
                value: prefs.valueForKey(notificationCategoryPrefs[i].key),
                disabled: !inAppOn || (saving && _savingKey != notificationCategoryPrefs[i].key),
                saving: _savingKey == notificationCategoryPrefs[i].key,
                onChanged: (value) => _patchPref(notificationCategoryPrefs[i].key, value),
              ),
            ],
          ],
        ],
      ),
    );
  }
}
