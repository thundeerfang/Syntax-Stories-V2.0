import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/app_feedback.dart';
import '../../models/read_streak_payload.dart';
import '../../services/read_streak_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/blog_streak_limits.dart';
import '../../utils/user_message_case.dart';
import '../../widgets/blog_streak/blog_streak_panel.dart';
import '../../widgets/settings/settings_empty_inventory.dart';
import '../../widgets/settings/settings_section_scaffold.dart';
import '../../widgets/ui/app_feedback_banner.dart';

class BlogStreakScreen extends StatefulWidget {
  const BlogStreakScreen({super.key});

  @override
  State<BlogStreakScreen> createState() => _BlogStreakScreenState();
}

class _BlogStreakScreenState extends State<BlogStreakScreen> {
  static const _saveSuccessMessage = 'Read streak display updated.';

  final _api = ReadStreakApi();
  ReadStreakPayload? _payload;
  String _mode = blogStreakModeDaily;
  bool _loading = true;
  bool _saving = false;
  String? _feedback;

  @override
  void initState() {
    super.initState();
    _syncModeFromUser();
    _loadStreak();
  }

  void _syncModeFromUser() {
    final user = context.read<AuthState>().user;
    if (user != null) _mode = user.effectiveBlogStreakMode;
  }

  ReadStreakPayloadView? get _payloadView {
    final payload = _payload;
    if (payload == null) return null;
    return ReadStreakPayloadView(
      currentByMode: {
        for (final mode in blogStreakModes) mode: payload.countsFor(mode).current,
      },
      longestByMode: {
        for (final mode in blogStreakModes) mode: payload.countsFor(mode).longest,
      },
      totalDistinctReadDays: payload.totalDistinctReadDays,
    );
  }

  Future<void> _loadStreak() async {
    final username = context.read<AuthState>().user?.username?.trim();
    if (username == null || username.isEmpty) {
      if (mounted) {
        setState(() {
          _loading = false;
          _payload = null;
        });
      }
      return;
    }

    setState(() => _loading = true);
    final payload = await _api.fetchForUsername(username);
    if (!mounted) return;
    setState(() {
      _payload = payload;
      _loading = false;
    });
  }

  Future<void> _pullRefresh() async {
    setState(() => _feedback = null);
    await context.read<AuthState>().refreshUser();
    if (!mounted) return;
    _syncModeFromUser();
    await _loadStreak();
  }

  Future<void> _saveMode(String next) async {
    if (_saving || next == _mode) return;

    setState(() {
      _saving = true;
      _feedback = null;
    });

    final err = await context.read<AuthState>().updateProfileSection('blog-streak', {
      'blogStreakMode': next,
    });

    if (!mounted) return;

    if (err != null) {
      setState(() {
        _saving = false;
        _feedback = formatUserMessage(err);
      });
      return;
    }

    setState(() {
      _mode = next;
      _saving = false;
      _feedback = _saveSuccessMessage;
    });
    await _loadStreak();
  }

  AppFeedbackKind _feedbackKindFor(String message) {
    if (message == _saveSuccessMessage) return AppFeedbackKind.success;
    return AppFeedbackKind.error;
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final username = context.watch<AuthState>().user?.username?.trim();
    final view = _payloadView;
    final hasUsername = username != null && username.isNotEmpty;

    return SettingsSectionScaffold(
      title: 'Blog read streak',
      description:
          'One UTC day = you view one published post.\nYour profile shows daily, weekly, or monthly streaks.',
      icon: Icons.local_fire_department_outlined,
      iconOnPrimary: true,
      headerStyle: SettingsSectionHeaderStyle.centeredPlain,
      showHeaderTitle: false,
      onRefresh: _pullRefresh,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AppFeedbackSlot(
            message: _feedback == null ? null : formatUserMessage(_feedback!),
            kind: _feedback == null ? AppFeedbackKind.error : _feedbackKindFor(_feedback!),
          ),
          if (!hasUsername)
            SettingsEmptyInventory(
              icon: Icons.person_outline_rounded,
              message: 'SET A USERNAME ON YOUR PROFILE TO TRACK READ STREAKS.',
            )
          else ...[
            BlogStreakModeSelector(
              value: _mode,
              disabled: _saving,
              onChanged: _saveMode,
            ),
            const SizedBox(height: 20),
            Text(
              'CURRENT & LONGEST',
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.2,
                color: colors.mutedForeground,
              ),
            ),
            const SizedBox(height: 10),
            if (_loading && view == null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 32),
                child: Center(child: CircularProgressIndicator(color: colors.primary)),
              )
            else
              LayoutBuilder(
                builder: (context, constraints) {
                  final cardWidth = (constraints.maxWidth - 8) / 2;
                  return Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final mode in blogStreakModes)
                        SizedBox(
                          width: constraints.maxWidth >= 520 ? cardWidth : constraints.maxWidth,
                          child: BlogStreakMetricCard(
                            title: blogStreakModeLabel(mode),
                            current: view?.currentFor(mode) ?? 0,
                            longest: view?.longestFor(mode) ?? 0,
                            highlighted: _mode == mode,
                          ),
                        ),
                    ],
                  );
                },
              ),
            if (view != null && view.totalDistinctReadDays > 0) ...[
              const SizedBox(height: 14),
              Text(
                '${view.totalDistinctReadDays} distinct UTC read days recorded.',
                style: GoogleFonts.inter(fontSize: 11, color: colors.mutedForeground),
              ),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: _loading ? null : _loadStreak,
                child: Text(
                  'REFRESH NUMBERS',
                  style: GoogleFonts.inter(fontWeight: FontWeight.w900),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
