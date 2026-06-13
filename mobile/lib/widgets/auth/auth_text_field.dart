import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import '../../utils/field_validation_rules.dart';
import '../../utils/user_message_case.dart';
import '../profile/profile_form_fields.dart';
import '../ui/unfocus_tap_region.dart';

class AuthTextField extends StatefulWidget {
  const AuthTextField({
    super.key,
    required this.controller,
    required this.label,
    this.rule,
    this.validator,
    this.keyboardType,
    this.textCapitalization = TextCapitalization.none,
    this.autocorrect = true,
    this.maxLength,
    this.inputFormatters,
    this.enabled = true,
    this.onChanged,
    this.hintText,
    this.externalError,
    this.helperText,
    this.helperStyle,
    this.minLines,
    this.maxLines,
    this.textAlign = TextAlign.start,
    this.textStyle,
    this.showCounter = true,
    this.showFieldLabel = true,
    this.required = false,
  });

  final TextEditingController controller;
  final String label;
  final AppFieldRule? rule;
  final String? Function(String?)? validator;
  final TextInputType? keyboardType;
  final TextCapitalization textCapitalization;
  final bool autocorrect;
  final int? maxLength;
  final int? minLines;
  final int? maxLines;
  final List<TextInputFormatter>? inputFormatters;
  final bool enabled;
  final ValueChanged<String>? onChanged;
  final String? hintText;
  final String? externalError;
  final String? helperText;
  final TextStyle? helperStyle;
  final TextAlign textAlign;
  final TextStyle? textStyle;
  final bool showCounter;
  final bool showFieldLabel;
  final bool required;

  @override
  State<AuthTextField> createState() => _AuthTextFieldState();
}

class _AuthTextFieldState extends State<AuthTextField> {
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onTextChanged);
  }

  @override
  void didUpdateWidget(covariant AuthTextField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller.removeListener(_onTextChanged);
      widget.controller.addListener(_onTextChanged);
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onTextChanged);
    super.dispose();
  }

  void _onTextChanged() {
    if (mounted) setState(() {});
  }

  int? get _maxLength => widget.rule?.maxLength ?? widget.maxLength;

  List<TextInputFormatter> get _formatters {
    if (widget.rule != null) {
      final extra = widget.inputFormatters;
      if (extra == null || extra.isEmpty) return widget.rule!.inputFormatters;
      return [...widget.rule!.inputFormatters, ...extra];
    }
    return widget.inputFormatters ?? const [];
  }

  String? _formatError(String? value) =>
      value == null || value.isEmpty ? null : formatUserMessage(value);

  String? _validate(String? value) => _formatError(_validator?.call(value));

  String? Function(String?)? get _validator {
    if (widget.validator != null) return widget.validator;
    if (widget.rule != null) return widget.rule!.validate;
    return null;
  }

  Widget? _buildCounterSuffix(BuildContext context) {
    if (!widget.showCounter) return null;
    final rule = widget.rule;
    if (rule == null && _maxLength == null) return null;

    final label = rule != null
        ? rule.counterLabel(widget.controller.text)
        : '${widget.controller.text.length}/$_maxLength';

    return Padding(
      padding: const EdgeInsets.only(right: 4),
      child: Text(
        label,
        style: GoogleFonts.jetBrainsMono(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.4,
          color: context.appColors.mutedForeground.withValues(alpha: 0.55),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final labelStyle = Theme.of(context).inputDecorationTheme.labelStyle;

    return UnfocusTapRegion(
      child: TextFormField(
        controller: widget.controller,
        enabled: widget.enabled,
        keyboardType: widget.keyboardType,
        textCapitalization: widget.textCapitalization,
        autocorrect: widget.autocorrect,
        maxLength: _maxLength,
        minLines: widget.minLines,
        maxLines: widget.maxLines ?? (widget.minLines != null ? null : 1),
        inputFormatters: _formatters.isEmpty ? null : _formatters,
        onChanged: widget.onChanged,
        textAlign: widget.textAlign,
        style: widget.textStyle,
        autovalidateMode: AutovalidateMode.onUserInteraction,
        decoration: InputDecoration(
          label: widget.showFieldLabel && widget.required
              ? ProfileFieldLabel(
                  text: widget.label,
                  required: true,
                  style: labelStyle,
                )
              : null,
          labelText: widget.showFieldLabel && !widget.required ? widget.label : null,
          hintText: widget.hintText,
          errorText: _formatError(widget.externalError),
          helperText: widget.externalError == null ? widget.helperText : null,
          helperStyle: widget.helperStyle,
          counterText: _maxLength != null ? '' : null,
          suffix: _buildCounterSuffix(context),
          errorMaxLines: 2,
        ),
        validator: _validator == null ? null : _validate,
      ),
    );
  }
}

/// OTP field with digit-only input and 6-char limit.
class AuthOtpField extends StatelessWidget {
  const AuthOtpField({
    super.key,
    required this.controller,
    this.rule,
    this.validator,
    this.label = 'Verification code',
    this.showLabel = true,
    this.enabled = true,
    this.onChanged,
  });

  final TextEditingController controller;
  final AppFieldRule? rule;
  final String label;
  final bool showLabel;
  final String? Function(String?)? validator;
  final bool enabled;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (showLabel)
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 6),
            child: Text(
              label.toUpperCase(),
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.4,
                    color: Theme.of(context).hintColor,
                  ),
            ),
          ),
        AuthTextField(
          controller: controller,
          label: label.toUpperCase(),
          rule: rule ?? AppFieldRule.otp,
          validator: validator,
          enabled: enabled,
          onChanged: onChanged,
          autocorrect: false,
          keyboardType: TextInputType.number,
          textAlign: TextAlign.center,
          showFieldLabel: false,
          textStyle: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            letterSpacing: 8,
          ),
          hintText: '000000',
        ),
      ],
    );
  }
}
