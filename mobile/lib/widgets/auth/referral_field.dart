import 'dart:async';

import 'package:flutter/material.dart';

import '../../services/invite_api.dart';
import '../../utils/field_validation_rules.dart';
import '../../utils/referral_code.dart';
import '../../utils/user_message_case.dart';
import '../../theme/app_color_tokens.dart';
import 'auth_text_field.dart';

enum ReferralValidationState { idle, checking, valid, invalid, formatError }

/// Optional referral code field — same layout as [AuthTextField] (e.g. full name).
class AuthReferralField extends StatefulWidget {
  const AuthReferralField({
    super.key,
    required this.controller,
    required this.onStateChanged,
    this.disabled = false,
  });

  final TextEditingController controller;
  final void Function(ReferralValidationState state, InviteReferrer? referrer, String? error)
      onStateChanged;
  final bool disabled;

  @override
  State<AuthReferralField> createState() => _AuthReferralFieldState();
}

/// @deprecated Use [AuthReferralField].
typedef ReferralDropdownField = AuthReferralField;

class _AuthReferralFieldState extends State<AuthReferralField> {
  final _inviteApi = InviteApi();
  ReferralValidationState _state = ReferralValidationState.idle;
  InviteReferrer? _referrer;
  String? _error;
  Timer? _debounce;
  int _requestId = 0;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onChanged);
  }

  @override
  void dispose() {
    final timer = _debounce;
    _debounce = null;
    timer?.cancel();
    widget.controller.removeListener(_onChanged);
    super.dispose();
  }

  void _emit() => widget.onStateChanged(_state, _referrer, _error);

  void _onChanged() {
    _debounce?.cancel();
    final upper = widget.controller.text.toUpperCase();
    if (upper != widget.controller.text) {
      widget.controller.value = widget.controller.value.copyWith(
        text: upper,
        selection: TextSelection.collapsed(offset: upper.length),
      );
      return;
    }

    final trimmed = upper.trim();
    if (trimmed.isEmpty) {
      _requestId++;
      setState(() {
        _state = ReferralValidationState.idle;
        _referrer = null;
        _error = null;
      });
      _emit();
      return;
    }

    final formatMsg = referralCodeFormatMessage(trimmed);
    if (formatMsg != null && trimmed.length >= 8) {
      setState(() {
        _state = ReferralValidationState.formatError;
        _referrer = null;
        _error = formatMsg;
      });
      _emit();
      return;
    }

    if (trimmed.length < 8) {
      setState(() {
        _state = ReferralValidationState.idle;
        _referrer = null;
        _error = null;
      });
      _emit();
      return;
    }

    _debounce = Timer(const Duration(milliseconds: 450), () => _resolve(trimmed));
  }

  Future<void> _resolve(String raw) async {
    final requestId = ++_requestId;
    setState(() {
      _state = ReferralValidationState.checking;
      _referrer = null;
      _error = null;
    });
    _emit();

    try {
      final normalized = normalizeReferralCode(raw);
      if (normalized == null) {
        if (requestId != _requestId) return;
        setState(() {
          _state = ReferralValidationState.formatError;
          _error = referralCodeFormatMessage(raw);
        });
        _emit();
        return;
      }

      final out = await _inviteApi.resolveCode(normalized);
      if (requestId != _requestId) return;
      if (out == null) {
        setState(() {
          _state = ReferralValidationState.invalid;
          _error = formatUserMessage('Referral code not found.');
        });
      } else {
        setState(() {
          _state = ReferralValidationState.valid;
          _referrer = out;
          _error = null;
        });
      }
      _emit();
    } catch (_) {
      if (requestId != _requestId) return;
      setState(() {
        _state = ReferralValidationState.invalid;
        _error = formatUserMessage('Could not verify referral code.');
      });
      _emit();
    }
  }

  String? get _externalError {
    if (_error == null) return null;
    if (_state == ReferralValidationState.invalid || _state == ReferralValidationState.formatError) {
      return _error;
    }
    return null;
  }

  String? get _helperText {
    if (_externalError != null) return null;
    if (_state == ReferralValidationState.checking) return 'Verifying…';
    if (_state == ReferralValidationState.valid && _referrer != null) {
      final name =
          _referrer!.fullName.isNotEmpty ? _referrer!.fullName : _referrer!.username;
      return 'Referred by $name';
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return AuthTextField(
      controller: widget.controller,
      label: 'REFERRAL CODE (OPTIONAL)',
      rule: AppFieldRule.referralCode,
      hintText: 'Enter referral code',
      autocorrect: false,
      enabled: !widget.disabled,
      externalError: _externalError,
      helperText: _helperText,
      helperStyle: _state == ReferralValidationState.valid
          ? TextStyle(color: context.appColors.success)
          : null,
    );
  }
}

bool referralBlocksSignup(String input, ReferralValidationState state) {
  return input.trim().isNotEmpty &&
      state != ReferralValidationState.valid &&
      state != ReferralValidationState.idle;
}

String? resolvedReferralCode(String input, ReferralValidationState state) {
  if (state != ReferralValidationState.valid) return null;
  return normalizeReferralCode(input);
}
