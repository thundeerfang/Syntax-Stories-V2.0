import 'dart:convert';

import 'package:extended_text_field/extended_text_field.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../services/giphy_api.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/paragraph_doc.dart';
import '../../utils/paragraph_extended_span_builder.dart';
import '../../utils/url_normalize.dart';
import '../../utils/user_message_case.dart';
import '../ui/unfocus_tap_region.dart';

/// Web-style rich paragraph block editor: textarea + bold / italic / link / GIF.
class RichParagraphEditor extends StatefulWidget {
  const RichParagraphEditor({
    super.key,
    required this.payload,
    required this.onPayloadChanged,
  });

  final Map<String, dynamic> payload;
  final ValueChanged<Map<String, dynamic>> onPayloadChanged;

  @override
  State<RichParagraphEditor> createState() => _RichParagraphEditorState();
}

class _RichParagraphEditorState extends State<RichParagraphEditor> {
  late ParagraphDoc _doc;
  late TextEditingController _controller;
  final _giphyApi = GiphyApi();

  @override
  void initState() {
    super.initState();
    _doc = ParagraphDoc.fromPayload(widget.payload);
    final normalized = normalizeParagraphEditingText(_doc.editingText);
    _doc.editingText = normalized;
    _controller = TextEditingController(text: normalized);
    _controller.addListener(_onControllerChanged);
  }

  @override
  void didUpdateWidget(covariant RichParagraphEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (identical(oldWidget.payload, widget.payload)) return;
    if (_paragraphPayloadsEqual(_doc.toPayload(), widget.payload)) return;

    _doc = ParagraphDoc.fromPayload(widget.payload);
    final normalized = normalizeParagraphEditingText(_doc.editingText);
    _doc.editingText = normalized;
    if (_controller.text != normalized) {
      _controller.text = normalized;
    }
  }

  @override
  void reassemble() {
    super.reassemble();
    // Hot reload can leave stale ParagraphDoc instances with null bool fields.
    final text = _controller.text;
    final selection = _controller.selection;
    _doc = ParagraphDoc.fromPayload(_doc.toPayload());
    if (_controller.text != text) {
      _controller.text = text;
    }
    _setSelection(
      baseOffset: selection.baseOffset,
      extentOffset: selection.extentOffset,
      textLength: _controller.text.length,
    );
  }

  @override
  void dispose() {
    _controller.removeListener(_onControllerChanged);
    _controller.dispose();
    super.dispose();
  }

  void _onControllerChanged() {
    if (!mounted) return;
    if (_doc.editingText != _controller.text) {
      _doc.syncEditingText(_controller.text);
      _syncControllerToDoc();
    }
    setState(() {});
  }

  TextSelection get _selection => _controller.selection;

  int get _cursorStart => _selection.start >= 0 ? _selection.start : _controller.text.length;

  int get _cursorEnd => _selection.end >= 0 ? _selection.end : _controller.text.length;

  void _emit() {
    widget.onPayloadChanged(_doc.toPayload());
  }

  void _onTextChanged(String value) {
    _doc.syncEditingText(value);
    _syncControllerToDoc();
    _emit();
    setState(() {});
  }

  void _syncControllerToDoc() {
    final next = _doc.editingText;
    if (_controller.text == next) return;
    final selection = _controller.selection;
    _controller.text = next;
    _setSelection(
      baseOffset: selection.baseOffset,
      extentOffset: selection.extentOffset,
      textLength: next.length,
    );
  }

  void _setCollapsedSelection(int offset, {String? text}) {
    final length = text?.length ?? _controller.text.length;
    _controller.selection = TextSelection.collapsed(
      offset: offset.clamp(0, length),
    );
  }

  void _setSelection({
    required int baseOffset,
    required int extentOffset,
    required int textLength,
  }) {
    _controller.selection = TextSelection(
      baseOffset: baseOffset.clamp(0, textLength),
      extentOffset: extentOffset.clamp(0, textLength),
    );
  }

  void _toggleBold() {
    _doc.toggleBold(_cursorStart, _cursorEnd);
    if (_cursorStart != _cursorEnd) _emit();
    setState(() {});
  }

  void _toggleItalic() {
    _doc.toggleItalic(_cursorStart, _cursorEnd);
    if (_cursorStart != _cursorEnd) _emit();
    setState(() {});
  }

  Future<void> _openLinkSheet() async {
    final linkStart = _cursorStart;
    final linkEnd = _cursorEnd;
    final initialHref = _doc.pendingLinkHref ?? '';
    final result = await showModalBottomSheet<({String href, String label})?>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => _LinkSheet(initialHref: initialHref),
    );
    if (!mounted || result == null) return;

    if (result.href.isEmpty) {
      _doc.clearLink(linkStart, linkEnd);
      if (linkStart != linkEnd) _emit();
    } else if (linkStart == linkEnd) {
      _doc.insertLinkLabel(linkStart, result.label, result.href);
      _controller.text = _doc.editingText;
      final labelLen = result.label.trim().isEmpty ? result.href.length : result.label.trim().length;
      _setCollapsedSelection(linkStart + labelLen, text: _doc.editingText);
      _emit();
    } else {
      _doc.applyLink(linkStart, linkEnd, result.href);
      _controller.text = _doc.editingText;
      _emit();
    }
    setState(() {});
  }

  void _toggleUnderline() {
    _doc.toggleUnderline(_cursorStart, _cursorEnd);
    if (_cursorStart != _cursorEnd) _emit();
    setState(() {});
  }

  Future<void> _openGifSheet() async {
    final gif = await showModalBottomSheet<ParagraphGif?>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => _GifSearchSheet(giphyApi: _giphyApi),
    );
    if (!mounted || gif == null || gif.url.isEmpty) return;

    final index = _cursorStart;
    _doc.insertGif(index, gif);
    _controller.text = _doc.editingText;
    _setCollapsedSelection(index + kParagraphGifSlotLength, text: _doc.editingText);
    _emit();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final start = _cursorStart;
    final end = _cursorEnd;

    return UnfocusTapRegion(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              _ToolbarButton(
                icon: Icons.format_bold_rounded,
                active: _doc.isBoldActive(start, end),
                tooltip: 'Bold',
                onPressed: _toggleBold,
              ),
              _ToolbarButton(
                icon: Icons.format_italic_rounded,
                active: _doc.isItalicActive(start, end),
                tooltip: 'Italic',
                onPressed: _toggleItalic,
              ),
              _ToolbarButton(
                icon: Icons.format_underlined_rounded,
                active: _doc.isUnderlineActive(start, end),
                tooltip: 'Underline',
                onPressed: _toggleUnderline,
              ),
              _ToolbarButton(
                icon: Icons.link_rounded,
                active: _doc.isLinkActive(start, end),
                tooltip: 'Link',
                onPressed: _openLinkSheet,
              ),
              _ToolbarButton(
                icon: Icons.gif_box_outlined,
                label: 'GIF',
                active: false,
                tooltip: 'Insert GIF',
                onPressed: _openGifSheet,
              ),
            ],
          ),
          const SizedBox(height: 8),
          _RichParagraphInput(
            controller: _controller,
            doc: _doc,
            onChanged: _onTextChanged,
          ),
        ],
      ),
    );
  }
}

bool _paragraphPayloadsEqual(Map<String, dynamic> a, Map<String, dynamic> b) {
  return jsonEncode(a) == jsonEncode(b);
}

class _RichParagraphInput extends StatefulWidget {
  const _RichParagraphInput({
    required this.controller,
    required this.doc,
    required this.onChanged,
  });

  final TextEditingController controller;
  final ParagraphDoc doc;
  final ValueChanged<String> onChanged;

  @override
  State<_RichParagraphInput> createState() => _RichParagraphInputState();
}

class _RichParagraphInputState extends State<_RichParagraphInput> {
  final _focusNode = FocusNode();

  static const _padding = EdgeInsets.symmetric(horizontal: 12, vertical: 12);

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(_onFocusChanged);
    widget.controller.addListener(_onControllerChanged);
  }

  @override
  void didUpdateWidget(covariant _RichParagraphInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller.removeListener(_onControllerChanged);
      widget.controller.addListener(_onControllerChanged);
    }
  }

  void _onFocusChanged() => setState(() {});

  void _onControllerChanged() => setState(() {});

  @override
  void dispose() {
    widget.controller.removeListener(_onControllerChanged);
    _focusNode.removeListener(_onFocusChanged);
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    const fontSize = 14.0;
    const lineHeight = 1.5;
    final baseStyle = GoogleFonts.inter(
      fontSize: fontSize,
      height: lineHeight,
      color: colors.foreground,
    );
    const strutStyle = StrutStyle(
      fontSize: fontSize,
      height: lineHeight,
      forceStrutHeight: true,
      leading: 0,
    );
    final borderColor = _focusNode.hasFocus ? colors.primary : colors.border;
    final contentPadding = _padding;

    return Container(
      decoration: BoxDecoration(
        color: colors.background,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: borderColor, width: 1.5),
      ),
      clipBehavior: Clip.antiAlias,
      child: TextSelectionTheme(
        data: TextSelectionThemeData(
          cursorColor: colors.primary,
          selectionColor: colors.primary.withValues(alpha: 0.25),
        ),
        child: ExtendedTextField(
          controller: widget.controller,
          focusNode: _focusNode,
          minLines: 4,
          maxLines: null,
          textCapitalization: TextCapitalization.sentences,
          onChanged: widget.onChanged,
          style: baseStyle,
          strutStyle: strutStyle,
          cursorHeight: fontSize * lineHeight,
          specialTextSpanBuilder: ParagraphExtendedSpanBuilder(
            doc: widget.doc,
            colors: colors,
            baseStyle: baseStyle,
          ),
          decoration: InputDecoration(
            filled: true,
            fillColor: colors.background,
            hintText: 'Write your paragraph…',
            hintStyle: GoogleFonts.inter(
              fontSize: 14,
              height: 1.5,
              color: colors.mutedForeground.withValues(alpha: 0.7),
            ),
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            contentPadding: contentPadding,
          ),
        ),
      ),
    );
  }
}

class _ToolbarButton extends StatelessWidget {
  const _ToolbarButton({
    required this.icon,
    required this.active,
    required this.tooltip,
    required this.onPressed,
    this.label,
  });

  final IconData icon;
  final String? label;
  final bool active;
  final String tooltip;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Tooltip(
      message: tooltip,
      child: Material(
      color: active ? colors.primary.withValues(alpha: 0.15) : colors.muted.withValues(alpha: 0.35),
      child: InkWell(
        onTap: onPressed,
        child: Container(
          padding: EdgeInsets.symmetric(horizontal: label == null ? 8 : 10, vertical: 7),
          decoration: BoxDecoration(
            border: Border.all(
              color: active ? colors.primary : colors.border,
              width: 1.5,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: active ? colors.primary : colors.mutedForeground),
              if (label != null) ...[
                const SizedBox(width: 4),
                Text(
                  label!,
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: active ? colors.primary : colors.mutedForeground,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    ),
    );
  }
}

class _LinkSheet extends StatefulWidget {
  const _LinkSheet({required this.initialHref});

  final String initialHref;

  @override
  State<_LinkSheet> createState() => _LinkSheetState();
}

class _LinkSheetState extends State<_LinkSheet> {
  late final TextEditingController _url;
  late final TextEditingController _label;

  @override
  void initState() {
    super.initState();
    _url = TextEditingController(text: widget.initialHref);
    _label = TextEditingController();
  }

  @override
  void dispose() {
    _url.dispose();
    _label.dispose();
    super.dispose();
  }

  UrlNormalizeResult get _preview => normalizeUrlForStorage(_url.text);

  void _apply() {
    final parsed = _preview;
    if (_url.text.trim().isEmpty) {
      Navigator.pop(context, (href: '', label: ''));
      return;
    }
    if (!parsed.ok) return;
    Navigator.pop(context, (href: parsed.href, label: _label.text.trim()));
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    final parsed = _preview;

    return Padding(
      padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'LINK',
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
              color: colors.foreground,
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _url,
            decoration: InputDecoration(
              labelText: 'URL',
              hintText: 'https://example.com',
              errorText: _url.text.trim().isNotEmpty && !parsed.ok ? parsed.error : null,
            ),
            onChanged: (_) => setState(() {}),
            onSubmitted: (_) => _apply(),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _label,
            decoration: const InputDecoration(
              labelText: 'Label (optional)',
              hintText: 'Visible text',
            ),
            onSubmitted: (_) => _apply(),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: _url.text.trim().isEmpty || parsed.ok ? _apply : null,
                child: const Text('Apply'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _GifSearchSheet extends StatefulWidget {
  const _GifSearchSheet({required this.giphyApi});

  final GiphyApi giphyApi;

  @override
  State<_GifSearchSheet> createState() => _GifSearchSheetState();
}

class _GifSearchSheetState extends State<_GifSearchSheet> {
  final _query = TextEditingController();
  var _loading = false;
  var _searched = false;
  String? _error;
  List<GiphyGif> _results = const [];

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final q = _query.text.trim();
    if (q.isEmpty) return;
    setState(() {
      _loading = true;
      _error = null;
      _searched = true;
    });
    try {
      final results = await widget.giphyApi.searchGifs(q);
      if (!mounted) return;
      setState(() {
        _results = results;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = formatUserMessage(e.toString());
        _results = const [];
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final bottom = MediaQuery.viewInsetsOf(context).bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'GIF · GIPHY',
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
              color: colors.foreground,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _query,
                  decoration: const InputDecoration(
                    hintText: 'Search GIFs…',
                    prefixIcon: Icon(Icons.search, size: 20),
                  ),
                  onSubmitted: (_) => _search(),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: _loading || _query.text.trim().isEmpty ? null : _search,
                child: Text(_loading ? '…' : 'Go'),
              ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: GoogleFonts.inter(fontSize: 12, color: colors.destructive)),
          ],
          const SizedBox(height: 12),
          SizedBox(
            height: 220,
            child: _loading
                ? const Center(child: CircularProgressIndicator(strokeWidth: 2))
                : _results.isEmpty
                    ? Center(
                        child: Text(
                          _searched ? 'No results' : 'Search to preview',
                          style: GoogleFonts.inter(fontSize: 12, color: colors.mutedForeground),
                        ),
                      )
                    : GridView.builder(
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          crossAxisSpacing: 6,
                          mainAxisSpacing: 6,
                        ),
                        itemCount: _results.length,
                        itemBuilder: (context, index) {
                          final gif = _results[index];
                          return Material(
                            color: colors.muted.withValues(alpha: 0.2),
                            child: InkWell(
                              onTap: () => Navigator.pop(context, paragraphGifFromGiphy(gif)),
                              child: Image.network(
                                gif.previewUrl,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) =>
                                    const Icon(Icons.broken_image_outlined),
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
