import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import '../../utils/profile_month_year.dart';

/// Uppercase field label with optional red required asterisk.
class ProfileFieldLabel extends StatelessWidget {
  const ProfileFieldLabel({
    super.key,
    required this.text,
    this.required = false,
    this.suffix,
    this.style,
  });

  final String text;
  final bool required;
  final String? suffix;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final baseStyle = style ??
        GoogleFonts.inter(
          fontSize: 10,
          fontWeight: FontWeight.w900,
          letterSpacing: 1.2,
          color: colors.mutedForeground,
        );

    return Text.rich(
      TextSpan(
        children: [
          TextSpan(text: text, style: baseStyle),
          if (suffix != null) TextSpan(text: suffix, style: baseStyle),
          if (required)
            TextSpan(
              text: ' *',
              style: baseStyle.copyWith(color: colors.destructive),
            ),
        ],
      ),
    );
  }
}

class ProfileMonthYearRow extends StatelessWidget {
  const ProfileMonthYearRow({
    super.key,
    required this.label,
    required this.month,
    required this.year,
    required this.onMonthChanged,
    required this.onYearChanged,
    this.enabled = true,
    this.required = false,
    this.hasError = false,
    this.errorText,
    this.searchablePickers = false,
    this.minYear,
    this.maxYear,
  });

  final String label;
  final String month;
  final String year;
  final ValueChanged<String?> onMonthChanged;
  final ValueChanged<String?> onYearChanged;
  final bool enabled;
  final bool required;
  final bool hasError;
  final String? errorText;
  final bool searchablePickers;
  final int? minYear;
  final int? maxYear;

  String _monthLabel(String value) {
    if (value.isEmpty) return '';
    return profileMonthOptions
            .where((m) => m.$1 == value)
            .map((m) => m.$2)
            .firstOrNull ??
        value;
  }

  List<String> get _yearOptions => profileYearOptions(
        minYear: minYear ?? profileDateStartYear,
        maxYear: maxYear,
      );

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final borderColor = hasError ? colors.destructive : colors.border.withValues(alpha: 0.85);
    final border = Border.all(color: borderColor, width: 2);

    if (searchablePickers) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ProfileFieldLabel(text: label, required: required),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _ProfileSearchPickerTile(
                  value: month,
                  displayText: month.isEmpty ? null : _monthLabel(month).toUpperCase(),
                  placeholder: 'Select month',
                  enabled: enabled,
                  border: border,
                  onOpen: () => _openMonthPicker(context),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ProfileSearchPickerTile(
                  value: year,
                  displayText: year.isEmpty ? null : year.toUpperCase(),
                  placeholder: 'Select year',
                  enabled: enabled,
                  border: border,
                  onOpen: () => _openYearPicker(context),
                ),
              ),
            ],
          ),
          if (hasError && errorText != null) ...[
            const SizedBox(height: 6),
            Text(
              errorText!,
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: colors.destructive,
                height: 1.25,
              ),
            ),
          ],
        ],
      );
    }

    final itemStyle = GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ProfileFieldLabel(text: label, required: required),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(border: border, color: colors.card),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    isExpanded: true,
                    value: month.isEmpty ? null : month,
                    hint: Text('Month', style: itemStyle.copyWith(color: colors.mutedForeground)),
                    items: profileMonthOptions
                        .map(
                          (m) => DropdownMenuItem(value: m.$1, child: Text(m.$2, style: itemStyle)),
                        )
                        .toList(),
                    onChanged: enabled ? onMonthChanged : null,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(border: border, color: colors.card),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    isExpanded: true,
                    value: year.isEmpty ? null : year,
                    hint: Text('Year', style: itemStyle.copyWith(color: colors.mutedForeground)),
                    items: _yearOptions
                        .map((y) => DropdownMenuItem(value: y, child: Text(y, style: itemStyle)))
                        .toList(),
                    onChanged: enabled ? onYearChanged : null,
                  ),
                ),
              ),
            ),
          ],
        ),
        if (hasError && errorText != null) ...[
          const SizedBox(height: 6),
          Text(
            errorText!,
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: colors.destructive,
              height: 1.25,
            ),
          ),
        ],
      ],
    );
  }

  Future<void> _openMonthPicker(BuildContext context) async {
    if (!enabled) return;
    final options = profileMonthOptions
        .map((m) => _ProfileSearchOption(value: m.$1, label: m.$2))
        .toList();
    final picked = await _showProfileSearchPicker(
      context,
      title: 'MONTH',
      options: options,
      selected: month,
    );
    if (picked != null) onMonthChanged(picked);
  }

  Future<void> _openYearPicker(BuildContext context) async {
    if (!enabled) return;
    final options = _yearOptions
        .map((y) => _ProfileSearchOption(value: y, label: y))
        .toList();
    final picked = await _showProfileSearchPicker(
      context,
      title: 'YEAR',
      options: options,
      selected: year,
    );
    if (picked != null) onYearChanged(picked);
  }
}

class _ProfileSearchOption {
  const _ProfileSearchOption({required this.value, required this.label});

  final String value;
  final String label;
}

Future<String?> _showProfileSearchPicker(
  BuildContext context, {
  required String title,
  required List<_ProfileSearchOption> options,
  required String selected,
}) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    backgroundColor: context.appColors.card,
    builder: (ctx) => _ProfileSearchPickerSheet(
      title: title,
      options: options,
      selected: selected,
    ),
  );
}

class _ProfileSearchPickerTile extends StatelessWidget {
  const _ProfileSearchPickerTile({
    required this.value,
    required this.displayText,
    required this.placeholder,
    required this.enabled,
    required this.border,
    required this.onOpen,
  });

  final String value;
  final String? displayText;
  final String placeholder;
  final bool enabled;
  final BoxBorder border;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final text = displayText ?? (value.isEmpty ? placeholder : value);

    return Material(
      color: colors.card,
      child: InkWell(
        onTap: enabled ? onOpen : null,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          decoration: BoxDecoration(border: border),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  text.toUpperCase(),
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: value.isEmpty ? colors.mutedForeground : colors.foreground,
                  ),
                ),
              ),
              Icon(
                Icons.expand_more_rounded,
                size: 20,
                color: enabled ? colors.primary : colors.mutedForeground,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProfileSearchPickerSheet extends StatefulWidget {
  const _ProfileSearchPickerSheet({
    required this.title,
    required this.options,
    required this.selected,
  });

  final String title;
  final List<_ProfileSearchOption> options;
  final String selected;

  @override
  State<_ProfileSearchPickerSheet> createState() => _ProfileSearchPickerSheetState();
}

class _ProfileSearchPickerSheetState extends State<_ProfileSearchPickerSheet> {
  final _search = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<_ProfileSearchOption> get _filtered {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return widget.options;
    return widget.options
        .where((o) => o.label.toLowerCase().contains(q) || o.value.toLowerCase().contains(q))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final filtered = _filtered;
    final height = MediaQuery.sizeOf(context).height * 0.72;

    return SafeArea(
      child: SizedBox(
        height: height,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Text(
                widget.title,
                style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w900, letterSpacing: 1),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                controller: _search,
                onChanged: (v) => setState(() => _query = v),
                decoration: InputDecoration(
                  hintText: 'Search…',
                  prefixIcon: const Icon(Icons.search_rounded, size: 20),
                  border: OutlineInputBorder(borderSide: BorderSide(color: colors.border, width: 2)),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: filtered.isEmpty
                  ? Center(
                      child: Text(
                        'NO MATCHES',
                        style: GoogleFonts.inter(color: colors.mutedForeground, fontWeight: FontWeight.w700),
                      ),
                    )
                  : ListView.builder(
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final opt = filtered[index];
                        final isSelected = opt.value == widget.selected;
                        return ListTile(
                          title: Text(
                            opt.label,
                            style: GoogleFonts.inter(
                              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                              color: isSelected ? colors.primary : colors.foreground,
                            ),
                          ),
                          onTap: () => Navigator.pop(context, opt.value),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

extension _MonthOptionFirstOrNull<T> on Iterable<T> {
  T? get firstOrNull {
    final it = iterator;
    if (!it.moveNext()) return null;
    return it.current;
  }
}

class ProfileEnumField extends StatelessWidget {
  const ProfileEnumField({
    super.key,
    required this.label,
    required this.value,
    required this.options,
    required this.onChanged,
    this.hint = 'Select',
    this.enabled = true,
    this.required = false,
    this.hasError = false,
    this.errorText,
  });

  final String label;
  final String value;
  final List<String> options;
  final ValueChanged<String?> onChanged;
  final String hint;
  final bool enabled;
  final bool required;
  final bool hasError;
  final String? errorText;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final borderColor = hasError ? colors.destructive : colors.border.withValues(alpha: 0.85);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ProfileFieldLabel(text: label, required: required),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(
            border: Border.all(color: borderColor, width: 2),
            color: colors.card,
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              isExpanded: true,
              value: value.isEmpty ? null : value,
              hint: Text(
                hint,
                style: GoogleFonts.inter(fontSize: 12, color: colors.mutedForeground),
              ),
              items: options
                  .map(
                    (o) => DropdownMenuItem(
                      value: o,
                      child: Text(o, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600)),
                    ),
                  )
                  .toList(),
              onChanged: enabled ? onChanged : null,
            ),
          ),
        ),
        if (hasError && errorText != null) ...[
          const SizedBox(height: 6),
          Text(
            errorText!,
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: colors.destructive,
              height: 1.25,
            ),
          ),
        ],
      ],
    );
  }
}
