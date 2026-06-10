import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/tech_stack_item.dart';
import '../../services/reference_api.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/stack_tools_limits.dart';
import 'skill_icon_image.dart';

/// Read-only stack badges for profile surfaces — icons from backend resolve.
class StackToolsDisplayList extends StatefulWidget {
  const StackToolsDisplayList({
    super.key,
    required this.names,
    this.displayItems = const [],
  });

  final List<String> names;
  final List<TechStackItem> displayItems;

  @override
  State<StackToolsDisplayList> createState() => _StackToolsDisplayListState();
}

class _StackToolsDisplayListState extends State<StackToolsDisplayList> {
  final _api = ReferenceApi();
  List<TechStackItem> _resolved = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant StackToolsDisplayList oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.names.join('\u0000') != widget.names.join('\u0000') ||
        _displayKey(oldWidget.displayItems) != _displayKey(widget.displayItems)) {
      _load();
    }
  }

  static String _displayKey(List<TechStackItem> items) =>
      items.map((e) => '${e.name}\u0000${e.iconUrl}').join('\u0001');

  Future<void> _load() async {
    final names = widget.names.take(stackAndToolsMax).toList();
    if (names.isEmpty) {
      if (mounted) setState(() => _resolved = []);
      return;
    }
    if (widget.displayItems.isNotEmpty) {
      if (mounted) setState(() => _resolved = widget.displayItems.take(stackAndToolsMax).toList());
      return;
    }
    final list = await _api.resolveTechStack(names);
    if (!mounted) return;
    setState(() => _resolved = list);
  }

  @override
  Widget build(BuildContext context) {
    final names = widget.names.take(stackAndToolsMax).toList();
    if (names.isEmpty) return const SizedBox.shrink();

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (var i = 0; i < names.length; i++)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: context.appColors.muted.withValues(alpha: 0.08),
              border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 22,
                  height: 22,
                  child: SkillIconImage(
                    name: names[i],
                    slug: i < _resolved.length
                        ? (_resolved[i].iconSlug.isNotEmpty
                            ? _resolved[i].iconSlug
                            : _resolved[i].slug)
                        : null,
                    iconUrl: i < _resolved.length ? _resolved[i].iconUrl : null,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  names[i].toUpperCase(),
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.6,
                    color: context.appColors.mutedForeground,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
