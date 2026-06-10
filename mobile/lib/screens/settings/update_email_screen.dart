import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/app_feedback.dart';
import '../../services/api_errors.dart';
import '../../services/auth_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/field_validation_rules.dart';
import '../../utils/user_message_case.dart';
import '../../widgets/auth/auth_text_field.dart';
import '../../widgets/profile/profile_form_fields.dart';
import '../../widgets/settings/settings_section_scaffold.dart';
import '../../widgets/ui/app_feedback_banner.dart';
import '../../widgets/ui/dashed_border_box.dart';
import '../../widgets/ui/unfocus_tap_region.dart';

enum _EmailChangeStep { enter, verify }

class UpdateEmailScreen extends StatefulWidget {
  const UpdateEmailScreen({super.key});

  @override
  State<UpdateEmailScreen> createState() => _UpdateEmailScreenState();
}

class _UpdateEmailScreenState extends State<UpdateEmailScreen> {
  static const _codesSentMessage = 'Verification codes sent.';
  static const _updatedMessage = 'Email updated. Re-link your connected accounts.';

  final _api = AuthApi();
  final _newEmail = TextEditingController();
  final _currentCode = TextEditingController();
  final _newCode = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  _EmailChangeStep _step = _EmailChangeStep.enter;
  bool _sending = false;
  bool _verifying = false;
  bool _cancelling = false;
  String? _feedback;
  AppFeedbackKind _feedbackKind = AppFeedbackKind.error;

  @override
  void dispose() {
    _newEmail.dispose();
    _currentCode.dispose();
    _newCode.dispose();
    super.dispose();
  }

  void _setFeedback(String? message, {AppFeedbackKind kind = AppFeedbackKind.error}) {
    setState(() {
      _feedback = message;
      _feedbackKind = kind;
    });
  }

  Future<void> _sendCodes() async {
    if (_sending) return;
    _setFeedback(null);

    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      _setFeedback('Not signed in.');
      return;
    }

    if (!(_formKey.currentState?.validate() ?? false)) return;

    final currentEmail = context.read<AuthState>().user?.email.trim().toLowerCase() ?? '';
    final nextEmail = _newEmail.text.trim().toLowerCase();
    if (nextEmail == currentEmail) {
      _setFeedback('That is already your email.');
      return;
    }

    setState(() => _sending = true);
    try {
      await _api.initEmailChange(accessToken: token, newEmail: nextEmail);
      if (!mounted) return;
      setState(() {
        _step = _EmailChangeStep.verify;
        _currentCode.clear();
        _newCode.clear();
        _sending = false;
      });
      _setFeedback(_codesSentMessage, kind: AppFeedbackKind.success);
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() => _sending = false);
      _setFeedback(formatUserMessage(e.message));
    } catch (_) {
      if (!mounted) return;
      setState(() => _sending = false);
      _setFeedback(formatUserMessage(kGenericUserError));
    }
  }

  Future<void> _verifyCodes() async {
    if (_verifying) return;
    _setFeedback(null);

    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      _setFeedback('Not signed in.');
      return;
    }

    final current = _currentCode.text.trim();
    final next = _newCode.text.trim();
    if (current.length != FieldLimits.otpLength || next.length != FieldLimits.otpLength) {
      _setFeedback('Both 6-digit codes are required.');
      return;
    }

    setState(() => _verifying = true);
    try {
      await _api.verifyEmailChange(
        accessToken: token,
        currentCode: current,
        newCode: next,
      );
      if (!mounted) return;
      await context.read<AuthState>().refreshUser();
      if (!mounted) return;
      setState(() {
        _step = _EmailChangeStep.enter;
        _newEmail.clear();
        _currentCode.clear();
        _newCode.clear();
        _verifying = false;
      });
      _setFeedback(_updatedMessage, kind: AppFeedbackKind.success);
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() => _verifying = false);
      _setFeedback(formatUserMessage(e.message));
    } catch (_) {
      if (!mounted) return;
      setState(() => _verifying = false);
      _setFeedback(formatUserMessage(kGenericUserError));
    }
  }

  Future<void> _cancelChange() async {
    if (_cancelling) return;
    _setFeedback(null);

    final token = context.read<AuthState>().accessToken;
    setState(() => _cancelling = true);
    if (token != null && token.isNotEmpty) {
      try {
        await _api.cancelEmailChange(accessToken: token);
      } catch (_) {
        // Still reset local step so the user can retry.
      }
    }
    if (!mounted) return;
    setState(() {
      _step = _EmailChangeStep.enter;
      _currentCode.clear();
      _newCode.clear();
      _cancelling = false;
    });
    _setFeedback('Email change cancelled. Request new codes to try again.');
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final currentEmail = context.watch<AuthState>().user?.email.trim() ?? '—';
    final pendingNewEmail = _newEmail.text.trim();
    final busy = _sending || _verifying || _cancelling;

    return SettingsSectionScaffold(
      title: 'Update email',
      description:
          'Dual verification on your current and new inbox.\nOAuth accounts unlink after a successful change.',
      icon: Icons.mail_outline_rounded,
      iconOnPrimary: true,
      headerStyle: SettingsSectionHeaderStyle.centeredPlain,
      showHeaderTitle: false,
      body: UnfocusTapRegion(
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _StepIndicator(active: _step),
              const SizedBox(height: 16),
              AppFeedbackSlot(
                message: _feedback == null ? null : formatUserMessage(_feedback!),
                kind: _feedbackKind,
                onDismiss: () => _setFeedback(null),
              ),
              if (_step == _EmailChangeStep.enter) ...[
                ProfileFieldLabel(text: 'CURRENT EMAIL'),
                const SizedBox(height: 8),
                _ReadOnlyEmailBox(email: currentEmail),
                const SizedBox(height: 16),
                AuthTextField(
                  controller: _newEmail,
                  label: 'New email',
                  rule: AppFieldRule.email,
                  enabled: !busy,
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  onChanged: (_) {
                    if (_feedback != null) _setFeedback(null);
                  },
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: busy ? null : _sendCodes,
                    child: _sending
                        ? SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: colors.primaryForeground,
                            ),
                          )
                        : Text(
                            'REQUEST VERIFICATION CODES',
                            style: GoogleFonts.inter(fontWeight: FontWeight.w900),
                          ),
                  ),
                ),
              ] else ...[
                AuthOtpField(
                  controller: _currentCode,
                  label: 'Code from current email',
                  enabled: !busy,
                  onChanged: (_) {
                    if (_feedback != null) _setFeedback(null);
                  },
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 4, bottom: 12),
                  child: Text(
                    'Sent to $currentEmail',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(fontSize: 10, color: colors.mutedForeground),
                  ),
                ),
                AuthOtpField(
                  controller: _newCode,
                  label: 'Code from new email',
                  enabled: !busy,
                  onChanged: (_) {
                    if (_feedback != null) _setFeedback(null);
                  },
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 4, bottom: 16),
                  child: Text(
                    pendingNewEmail.isEmpty ? 'Check your new inbox' : 'Sent to $pendingNewEmail',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(fontSize: 10, color: colors.mutedForeground),
                  ),
                ),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: busy ? null : _verifyCodes,
                    child: _verifying
                        ? SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: colors.primaryForeground,
                            ),
                          )
                        : Text(
                            'CONFIRM EMAIL CHANGE',
                            style: GoogleFonts.inter(fontWeight: FontWeight.w900),
                          ),
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: busy ? null : _cancelChange,
                    child: Text(
                      'CANCEL',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w900),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              DashedBorderBox(
                color: colors.border.withValues(alpha: 0.45),
                strokeWidth: 2,
                dashLength: 10,
                dashGap: 6,
                backgroundColor: colors.muted.withValues(alpha: 0.08),
                padding: const EdgeInsets.all(14),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.shield_outlined, size: 18, color: colors.primary),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'After your email updates, connected OAuth providers are unlinked for security. '
                        'Re-link them from Connected accounts.',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          height: 1.45,
                          color: colors.mutedForeground,
                        ),
                      ),
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
}

class _StepIndicator extends StatelessWidget {
  const _StepIndicator({required this.active});

  final _EmailChangeStep active;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Row(
      children: [
        Expanded(
          child: _StepPill(
            label: '01. ENTER',
            active: active == _EmailChangeStep.enter,
            colors: colors,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _StepPill(
            label: '02. VERIFY',
            active: active == _EmailChangeStep.verify,
            colors: colors,
          ),
        ),
      ],
    );
  }
}

class _StepPill extends StatelessWidget {
  const _StepPill({
    required this.label,
    required this.active,
    required this.colors,
  });

  final String label;
  final bool active;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: active ? colors.primary : colors.card,
        border: Border.all(
          color: active ? colors.primary : colors.border.withValues(alpha: 0.85),
          width: 2,
        ),
      ),
      child: Text(
        label,
        textAlign: TextAlign.center,
        style: GoogleFonts.inter(
          fontSize: 9,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.6,
          color: active ? colors.primaryForeground : colors.mutedForeground,
        ),
      ),
    );
  }
}

class _ReadOnlyEmailBox extends StatelessWidget {
  const _ReadOnlyEmailBox({required this.email});

  final String email;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(
        color: colors.muted.withValues(alpha: 0.12),
        border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 2),
      ),
      child: Text(
        email,
        style: GoogleFonts.inter(
          fontSize: 13,
          fontStyle: FontStyle.italic,
          color: colors.mutedForeground,
        ),
      ),
    );
  }
}
