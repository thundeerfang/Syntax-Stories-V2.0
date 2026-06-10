import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/tech_stack_item.dart';
import '../../services/reference_api.dart';
import '../../theme/app_color_tokens.dart';
import 'skill_icon_image.dart';

class StackToolBadge extends StatelessWidget {
  const StackToolBadge({
    super.key,
    required this.name,
    this.iconUrl,
    this.iconSlug,
    required this.onRemove,
  });

  final String name;
  final String? iconUrl;
  final String? iconSlug;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(8, 6, 4, 6),
      decoration: BoxDecoration(
        color: context.appColors.card,
        border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 20,
            height: 20,
            child: SkillIconImage(
              name: name,
              slug: iconSlug,
              iconUrl: iconUrl,
              size: 20,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            name.toUpperCase(),
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.6,
            ),
          ),
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onRemove,
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Icon(
                  Icons.close_rounded,
                  size: 14,
                  color: context.appColors.mutedForeground,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Resolves stack tool names via the backend and renders removable badges.
class StackToolsBadgeList extends StatefulWidget {
  const StackToolsBadgeList({
    super.key,
    required this.names,
    required this.onRemoveAt,
  });

  final List<String> names;
  final ValueChanged<int> onRemoveAt;

  @override
  State<StackToolsBadgeList> createState() => _StackToolsBadgeListState();
}

class _StackToolsBadgeListState extends State<StackToolsBadgeList> {
  final _api = ReferenceApi();
  List<TechStackItem> _resolved = [];
  Timer? _debounce;
  int _generation = 0;

  @override
  void initState() {
    super.initState();
    _scheduleResolve();
  }

  @override
  void didUpdateWidget(covariant StackToolsBadgeList oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_listEquals(oldWidget.names, widget.names)) {
      _scheduleResolve();
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  bool _listEquals(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  void _scheduleResolve() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 150), _resolve);
  }

  Future<void> _resolve() async {
    final generation = ++_generation;
    final names = widget.names;
    if (names.isEmpty) {
      if (mounted) setState(() => _resolved = []);
      return;
    }

    final list = await _api.resolveTechStack(names);
    if (!mounted || generation != _generation) return;
    setState(() => _resolved = list);
  }

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (var i = 0; i < widget.names.length; i++)
          StackToolBadge(
            name: widget.names[i],
            iconUrl: i < _resolved.length ? _resolved[i].iconUrl : null,
            iconSlug: i < _resolved.length ? _resolved[i].iconSlug : null,
            onRemove: () => widget.onRemoveAt(i),
          ),
      ],
    );
  }
}
