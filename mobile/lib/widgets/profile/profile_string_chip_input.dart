import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../auth/auth_text_field.dart';
import 'profile_form_fields.dart';
import 'profile_primary_add_button.dart';

class ProfileStringChipInput extends StatefulWidget {
  const ProfileStringChipInput({
    super.key,
    required this.label,
    required this.values,
    required this.maxValues,
    required this.maxLength,
    required this.onChanged,
    this.hint = 'Add skill',
    this.disabled = false,
    this.required = false,
    this.hasError = false,
    this.errorText,
  });

  final String label;
  final List<String> values;
  final int maxValues;
  final int maxLength;
  final ValueChanged<List<String>> onChanged;
  final String hint;
  final bool disabled;
  final bool required;
  final bool hasError;
  final String? errorText;

  @override
  State<ProfileStringChipInput> createState() => _ProfileStringChipInputState();
}

class _ProfileStringChipInputState extends State<ProfileStringChipInput> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _add() {
    final raw = _controller.text.trim();
    if (raw.isEmpty || widget.values.length >= widget.maxValues) return;
    final value = raw.length > widget.maxLength ? raw.substring(0, widget.maxLength) : raw;
    if (widget.values.any((v) => v.toLowerCase() == value.toLowerCase())) {
      _controller.clear();
      return;
    }
    widget.onChanged([...widget.values, value]);
    _controller.clear();
    setState(() {});
  }

  void _remove(String value) {
    widget.onChanged(widget.values.where((v) => v != value).toList());
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final canAdd = !widget.disabled && widget.values.length < widget.maxValues;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ProfileFieldLabel(
          text: widget.label,
          suffix: ' (${widget.values.length}/${widget.maxValues})',
          required: widget.required,
        ),
        const SizedBox(height: 8),
        if (widget.values.isNotEmpty)
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final value in widget.values)
                InputChip(
                  label: Text(
                    value.toUpperCase(),
                    style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800),
                  ),
                  onDeleted: widget.disabled ? null : () => _remove(value),
                ),
            ],
          ),
        if (widget.values.isNotEmpty) const SizedBox(height: 10),
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Expanded(
              child: AuthTextField(
                controller: _controller,
                label: '',
                hintText: widget.hint.toUpperCase(),
                maxLength: widget.maxLength,
                enabled: canAdd,
                showCounter: false,
                showFieldLabel: false,
                externalError: widget.hasError ? widget.errorText : null,
                onChanged: (_) => setState(() {}),
              ),
            ),
            const SizedBox(width: 8),
            ProfilePrimaryAddButton(
              onPressed: canAdd ? _add : null,
              enabled: canAdd,
            ),
          ],
        ),
      ],
    );
  }
}
