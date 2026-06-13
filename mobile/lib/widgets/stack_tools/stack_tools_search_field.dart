import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/tech_stack_item.dart';
import '../../services/reference_api.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/stack_tools_limits.dart';
import 'skill_icon_image.dart';

class StackToolsSearchField extends StatefulWidget {
  const StackToolsSearchField({
    super.key,
    required this.disabled,
    required this.existingItems,
    required this.onAdd,
  });

  final bool disabled;
  final List<String> existingItems;
  final ValueChanged<String> onAdd;

  @override
  State<StackToolsSearchField> createState() => _StackToolsSearchFieldState();
}

class _StackToolsSearchFieldState extends State<StackToolsSearchField> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  final _api = ReferenceApi();

  List<TechStackItem> _suggestions = [];
  int _highlight = 0;
  bool _open = false;
  bool _loading = false;
  Timer? _debounce;
  int _fetchGeneration = 0;

  bool get _atMax => widget.disabled;
  bool get _showDropdown =>
      _open && _controller.text.trim().length >= stackSearchMinChars && !_atMax;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onInputChanged);
    _focusNode.addListener(() {
      if (_focusNode.hasFocus) {
        setState(() => _open = true);
      } else {
        _closeDropdownDelayed();
      }
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.removeListener(_onInputChanged);
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onInputChanged() {
    setState(() {
      _open = true;
      _highlight = 0;
    });
    _debounce?.cancel();
    final q = _controller.text.trim();
    if (q.length < stackSearchMinChars) {
      setState(() {
        _suggestions = [];
        _loading = false;
      });
      return;
    }
    setState(() => _loading = true);
    _debounce = Timer(const Duration(milliseconds: 300), () => _fetchSuggestions(q));
  }

  Future<void> _fetchSuggestions(String q) async {
    final generation = ++_fetchGeneration;
    final list = await _api.searchTechStack(q);
    if (!mounted || generation != _fetchGeneration) return;
    setState(() {
      _suggestions = list;
      _loading = false;
      _highlight = 0;
    });
  }

  void _addByName(String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) {
      _clearSearch();
      return;
    }
    if (widget.existingItems.contains(trimmed)) {
      _clearSearch();
      return;
    }
    widget.onAdd(trimmed.length > stackToolNameMax ? trimmed.substring(0, stackToolNameMax) : trimmed);
    _clearSearch();
  }

  void _clearSearch() {
    _controller.clear();
    setState(() {
      _open = false;
      _highlight = 0;
      _suggestions = [];
    });
    _focusNode.unfocus();
  }

  void _selectSuggestion(TechStackItem item) => _addByName(item.name);

  void _closeDropdownDelayed() {
    Future<void>.delayed(const Duration(milliseconds: 150), () {
      if (!mounted || _focusNode.hasFocus) return;
      setState(() => _open = false);
    });
  }

  Widget _buildDropdownPanel() {
    if (_loading && _suggestions.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Center(
          child: SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: context.appColors.primary,
            ),
          ),
        ),
      );
    }

    if (_suggestions.isEmpty) {
      return _EmptySuggestions(query: _controller.text.trim(), onAddCustom: _addByName);
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < _suggestions.length; i++) ...[
          if (i > 0)
            Divider(
              height: 2,
              thickness: 2,
              color: context.appColors.border.withValues(alpha: 0.85),
            ),
          _SuggestionRow(
            item: _suggestions[i],
            selected: i == _highlight,
            onSelect: () => _selectSuggestion(_suggestions[i]),
            onHover: () => setState(() => _highlight = i),
          ),
        ],
      ],
    );
  }

  KeyEventResult _handleKey(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;
    if (!_showDropdown || _suggestions.isEmpty) {
      if (event.logicalKey == LogicalKeyboardKey.enter) {
        final v = _controller.text.trim();
        if (v.isNotEmpty) _addByName(v);
        return KeyEventResult.handled;
      }
      return KeyEventResult.ignored;
    }

    if (event.logicalKey == LogicalKeyboardKey.arrowDown) {
      setState(() {
        _highlight = _highlight < _suggestions.length - 1 ? _highlight + 1 : 0;
      });
      return KeyEventResult.handled;
    }
    if (event.logicalKey == LogicalKeyboardKey.arrowUp) {
      setState(() {
        _highlight = _highlight > 0 ? _highlight - 1 : _suggestions.length - 1;
      });
      return KeyEventResult.handled;
    }
    if (event.logicalKey == LogicalKeyboardKey.enter) {
      _selectSuggestion(_suggestions[_highlight]);
      return KeyEventResult.handled;
    }
    if (event.logicalKey == LogicalKeyboardKey.escape) {
      setState(() => _open = false);
      return KeyEventResult.handled;
    }
    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    final borderColor = _showDropdown
        ? context.appColors.primary
        : context.appColors.border.withValues(alpha: 0.85);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'MODULE SEARCH',
          style: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
            color: context.appColors.mutedForeground,
          ),
        ),
        const SizedBox(height: 8),
        Focus(
          onKeyEvent: _handleKey,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            decoration: BoxDecoration(
              color: context.appColors.background,
              border: Border.all(color: borderColor, width: 2),
              boxShadow: _showDropdown
                  ? [
                      BoxShadow(
                        color: context.appColors.primary.withValues(alpha: 0.15),
                        blurRadius: 0,
                        spreadRadius: 2,
                      ),
                    ]
                  : null,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _controller,
                  focusNode: _focusNode,
                  enabled: !_atMax,
                  maxLength: stackToolNameMax,
                  style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
                  decoration: InputDecoration(
                    isDense: true,
                    filled: true,
                    fillColor: context.appColors.background,
                    counterText: '',
                    hintText: _atMax
                        ? 'MAX $stackAndToolsMax — REMOVE ONE TO ADD MORE'
                        : 'e.g. React, TypeScript, Docker…',
                    hintStyle: GoogleFonts.inter(
                      fontSize: 13,
                      color: context.appColors.mutedForeground.withValues(alpha: 0.85),
                    ),
                    prefixIcon: Icon(
                      Icons.search_rounded,
                      size: 20,
                      color: _showDropdown
                          ? context.appColors.primary
                          : context.appColors.mutedForeground,
                    ),
                    prefixIconConstraints: const BoxConstraints(minWidth: 44, minHeight: 44),
                    suffixIcon: _loading
                        ? Padding(
                            padding: const EdgeInsets.only(right: 12),
                            child: SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: context.appColors.primary,
                              ),
                            ),
                          )
                        : null,
                    suffixIconConstraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    disabledBorder: InputBorder.none,
                    errorBorder: InputBorder.none,
                    focusedErrorBorder: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 14),
                  ),
                  onTap: () => setState(() => _open = true),
                  onEditingComplete: () {
                    final v = _controller.text.trim();
                    if (v.isNotEmpty) _addByName(v);
                  },
                ),
                if (_showDropdown) ...[
                  Divider(height: 2, thickness: 2, color: context.appColors.border.withValues(alpha: 0.85)),
                  _buildDropdownPanel(),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          '$stackToolNameMin–$stackToolNameMax characters per skill.',
          style: GoogleFonts.inter(
            fontSize: 9,
            color: context.appColors.mutedForeground,
          ),
        ),
      ],
    );
  }
}

class _EmptySuggestions extends StatelessWidget {
  const _EmptySuggestions({required this.query, required this.onAddCustom});

  final String query;
  final ValueChanged<String> onAddCustom;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      child: Column(
        children: [
          Icon(Icons.search_off_rounded, size: 28, color: context.appColors.mutedForeground.withValues(alpha: 0.7)),
          const SizedBox(height: 8),
          Text(
            'NO MATCHES FOUND',
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.8,
              color: context.appColors.mutedForeground,
            ),
          ),
          if (query.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              'Press Enter to add "$query" as a custom skill',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 10, color: context.appColors.mutedForeground),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () => onAddCustom(query),
              child: Text(
                'ADD "$query"',
                style: GoogleFonts.inter(fontWeight: FontWeight.w900, fontSize: 10, letterSpacing: 0.6),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _SuggestionRow extends StatelessWidget {
  const _SuggestionRow({
    required this.item,
    required this.selected,
    required this.onSelect,
    required this.onHover,
  });

  final TechStackItem item;
  final bool selected;
  final VoidCallback onSelect;
  final VoidCallback onHover;

  @override
  Widget build(BuildContext context) {
    final fg = selected ? Colors.white : context.appColors.foreground;
    final subFg = selected
        ? Colors.white.withValues(alpha: 0.85)
        : context.appColors.mutedForeground;

    return Material(
      color: selected ? context.appColors.primary : Colors.transparent,
      child: InkWell(
        onTapDown: (_) => onSelect(),
        onHover: (_) => onHover(),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: context.appColors.background,
                  border: Border.all(
                    color: selected
                        ? Colors.white
                        : context.appColors.border.withValues(alpha: 0.85),
                    width: 2,
                  ),
                ),
                child: SkillIconImage(
                  name: item.name,
                  slug: item.iconSlug.isNotEmpty ? item.iconSlug : item.slug,
                  iconUrl: item.iconUrl,
                  size: 28,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.name.toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.4,
                        color: fg,
                      ),
                    ),
                    Text(
                      item.category.toUpperCase(),
                      style: GoogleFonts.inter(
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.2,
                        color: subFg,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.add_rounded,
                size: 18,
                color: selected ? Colors.white : context.appColors.mutedForeground.withValues(alpha: 0.5),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
