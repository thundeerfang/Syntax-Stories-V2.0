import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../services/profile_location_service.dart';
import '../../theme/app_color_tokens.dart';

/// Optional country → state → city pickers (same data source as webapp profileLocation).
class ProfileLocationFields extends StatelessWidget {
  const ProfileLocationFields({
    super.key,
    required this.countryCode,
    required this.stateCode,
    required this.city,
    required this.onCountryChanged,
    required this.onStateChanged,
    required this.onCityChanged,
  });

  final String countryCode;
  final String stateCode;
  final String city;
  final ValueChanged<String> onCountryChanged;
  final ValueChanged<String> onStateChanged;
  final ValueChanged<String> onCityChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ProfileLocationPickerField(
          label: 'COUNTRY',
          value: countryCode,
          placeholder: 'Select country',
          loadOptions: ProfileLocationService.instance.getCountryOptions,
          resolveLabel: (code) => ProfileLocationService.instance.countryLabel(code),
          onSelected: (code) {
            onCountryChanged(code);
            onStateChanged('');
            onCityChanged('');
          },
        ),
        const SizedBox(height: 10),
        ProfileLocationPickerField(
          label: 'STATE / REGION',
          value: stateCode,
          placeholder: 'Select state',
          enabled: countryCode.isNotEmpty,
          loadOptions: () => ProfileLocationService.instance.getStateOptions(countryCode),
          resolveLabel: (code) => ProfileLocationService.instance.stateLabel(countryCode, code),
          onSelected: (code) {
            onStateChanged(code);
            onCityChanged('');
          },
        ),
        const SizedBox(height: 10),
        ProfileLocationPickerField(
          label: 'CITY',
          value: city,
          placeholder: 'Select city',
          enabled: countryCode.isNotEmpty,
          loadOptions: () => ProfileLocationService.instance.getCityOptions(countryCode, stateCode),
          resolveLabel: (name) async => name,
          onSelected: onCityChanged,
        ),
      ],
    );
  }
}

class ProfileLocationPickerField extends StatefulWidget {
  const ProfileLocationPickerField({
    super.key,
    required this.label,
    required this.value,
    required this.placeholder,
    required this.loadOptions,
    required this.resolveLabel,
    required this.onSelected,
    this.enabled = true,
  });

  final String label;
  final String value;
  final String placeholder;
  final Future<List<ProfileLocationOption>> Function() loadOptions;
  final Future<String> Function(String value) resolveLabel;
  final ValueChanged<String> onSelected;
  final bool enabled;

  @override
  State<ProfileLocationPickerField> createState() => _ProfileLocationPickerFieldState();
}

class _ProfileLocationPickerFieldState extends State<ProfileLocationPickerField> {
  String? _displayLabel;

  @override
  void initState() {
    super.initState();
    _refreshLabel();
  }

  @override
  void didUpdateWidget(covariant ProfileLocationPickerField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value) _refreshLabel();
  }

  Future<void> _refreshLabel() async {
    if (widget.value.isEmpty) {
      if (mounted) setState(() => _displayLabel = null);
      return;
    }
    final label = await widget.resolveLabel(widget.value);
    if (!mounted) return;
    setState(() => _displayLabel = label.isEmpty ? widget.value : label);
  }

  Future<void> _openPicker() async {
    if (!widget.enabled) return;
    final options = await widget.loadOptions();
    if (!mounted) return;
    final picked = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.appColors.card,
      builder: (ctx) => _LocationSearchSheet(
        title: widget.label,
        options: options,
        selected: widget.value,
      ),
    );
    if (picked == null || !mounted) return;
    widget.onSelected(picked);
    setState(() {
      _displayLabel = options
          .where((o) => o.value == picked)
          .map((o) => o.label)
          .firstOrNull;
    });
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final text = _displayLabel ?? (widget.value.isEmpty ? widget.placeholder : widget.value);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          widget.label,
          style: GoogleFonts.inter(
            fontSize: 9,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.1,
            color: colors.mutedForeground,
          ),
        ),
        const SizedBox(height: 6),
        Material(
          color: colors.card,
          child: InkWell(
            onTap: widget.enabled ? _openPicker : null,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
              decoration: BoxDecoration(
                border: Border.all(
                  color: colors.border.withValues(alpha: widget.enabled ? 0.85 : 0.35),
                  width: 2,
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      text.toUpperCase(),
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: widget.value.isEmpty
                            ? colors.mutedForeground
                            : colors.foreground,
                      ),
                    ),
                  ),
                  Icon(
                    Icons.expand_more_rounded,
                    size: 20,
                    color: widget.enabled ? colors.primary : colors.mutedForeground,
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _LocationSearchSheet extends StatefulWidget {
  const _LocationSearchSheet({
    required this.title,
    required this.options,
    required this.selected,
  });

  final String title;
  final List<ProfileLocationOption> options;
  final String selected;

  @override
  State<_LocationSearchSheet> createState() => _LocationSearchSheetState();
}

class _LocationSearchSheetState extends State<_LocationSearchSheet> {
  final _search = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<ProfileLocationOption> get _filtered {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return widget.options;
    return widget.options.where((o) => o.label.toLowerCase().contains(q)).toList();
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
                        final selected = opt.value == widget.selected;
                        return ListTile(
                          title: Text(
                            opt.label,
                            style: GoogleFonts.inter(
                              fontWeight: selected ? FontWeight.w800 : FontWeight.w500,
                              color: selected ? colors.primary : colors.foreground,
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

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull {
    final it = iterator;
    if (!it.moveNext()) return null;
    return it.current;
  }
}
