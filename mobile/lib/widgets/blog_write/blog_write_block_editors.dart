import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/blog_block.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/gallery_image_picker.dart';
import '../../utils/github_repo_utils.dart';
import '../../utils/mermaid_validate.dart';
import '../../utils/table_block_limits.dart';
import 'mermaid_preview_panel.dart';
import '../../utils/resolve_profile_media_url.dart';
import '../../utils/user_message_case.dart';
import '../../utils/video_embed_utils.dart';
import '../auth/auth_button.dart';
import '../auth/auth_text_field.dart';
import '../ui/dashed_border_box.dart';
import '../ui/image_upload_crop_dialog.dart';
import 'blog_image_layout_chips.dart';
import 'blog_image_layout_preview.dart';
import 'rich_paragraph_editor.dart';
import 'unsplash_block_editor.dart';

class _CodeLanguageOption {
  const _CodeLanguageOption({required this.id, required this.label});

  final String id;
  final String label;
}

const _codeLanguageOptions = <_CodeLanguageOption>[
  _CodeLanguageOption(id: 'plaintext', label: 'Plain text'),
  _CodeLanguageOption(id: 'dart', label: 'Dart'),
  _CodeLanguageOption(id: 'typescript', label: 'TypeScript'),
  _CodeLanguageOption(id: 'javascript', label: 'JavaScript'),
  _CodeLanguageOption(id: 'tsx', label: 'TSX'),
  _CodeLanguageOption(id: 'jsx', label: 'JSX'),
  _CodeLanguageOption(id: 'json', label: 'JSON'),
  _CodeLanguageOption(id: 'python', label: 'Python'),
  _CodeLanguageOption(id: 'rust', label: 'Rust'),
  _CodeLanguageOption(id: 'go', label: 'Go'),
  _CodeLanguageOption(id: 'java', label: 'Java'),
  _CodeLanguageOption(id: 'c', label: 'C'),
  _CodeLanguageOption(id: 'cpp', label: 'C++'),
  _CodeLanguageOption(id: 'csharp', label: 'C#'),
  _CodeLanguageOption(id: 'css', label: 'CSS'),
  _CodeLanguageOption(id: 'scss', label: 'SCSS'),
  _CodeLanguageOption(id: 'xml', label: 'HTML / XML'),
  _CodeLanguageOption(id: 'bash', label: 'Bash'),
  _CodeLanguageOption(id: 'shell', label: 'Shell'),
  _CodeLanguageOption(id: 'sql', label: 'SQL'),
  _CodeLanguageOption(id: 'yaml', label: 'YAML'),
  _CodeLanguageOption(id: 'markdown', label: 'Markdown'),
  _CodeLanguageOption(id: 'php', label: 'PHP'),
  _CodeLanguageOption(id: 'ruby', label: 'Ruby'),
  _CodeLanguageOption(id: 'swift', label: 'Swift'),
  _CodeLanguageOption(id: 'kotlin', label: 'Kotlin'),
  _CodeLanguageOption(id: 'graphql', label: 'GraphQL'),
  _CodeLanguageOption(id: 'diff', label: 'Diff'),
];

String _codeLanguageLabel(String id) {
  for (final option in _codeLanguageOptions) {
    if (option.id == id) return option.label;
  }
  return id;
}

bool _isKnownCodeLanguage(String id) => _codeLanguageOptions.any((option) => option.id == id);

class BlogWriteBlockEditor extends StatelessWidget {
  const BlogWriteBlockEditor({
    super.key,
    required this.block,
    required this.onChanged,
  });

  final BlogBlock block;
  final ValueChanged<BlogBlock> onChanged;

  @override
  Widget build(BuildContext context) {
    return switch (block.type) {
      BlogBlockType.paragraph => _ParagraphEditor(block: block, onChanged: onChanged),
      BlogBlockType.heading => _HeadingEditor(block: block, onChanged: onChanged),
      BlogBlockType.partition => _PartitionPreview(),
      BlogBlockType.code => _CodeEditor(block: block, onChanged: onChanged),
      BlogBlockType.image => _ImageEditor(block: block, onChanged: onChanged),
      BlogBlockType.videoEmbed => _VideoEmbedEditor(block: block, onChanged: onChanged),
      BlogBlockType.githubRepo => _GithubRepoEditor(block: block, onChanged: onChanged),
      BlogBlockType.unsplashImage => UnsplashBlockEditor(block: block, onChanged: onChanged),
      BlogBlockType.table => _TableEditor(block: block, onChanged: onChanged),
      BlogBlockType.mermaidDiagram => _MermaidEditor(block: block, onChanged: onChanged),
      _ => _ParagraphEditor(block: block, onChanged: onChanged),
    };
  }
}

class _ParagraphEditor extends StatefulWidget {
  const _ParagraphEditor({required this.block, required this.onChanged});

  final BlogBlock block;
  final ValueChanged<BlogBlock> onChanged;

  @override
  State<_ParagraphEditor> createState() => _ParagraphEditorState();
}

class _ParagraphEditorState extends State<_ParagraphEditor> {
  void _onPayloadChanged(Map<String, dynamic> payload) {
    widget.onChanged(widget.block.copyWith(payload: payload));
  }

  @override
  Widget build(BuildContext context) {
    return RichParagraphEditor(
      key: ValueKey(widget.block.id),
      payload: widget.block.payload,
      onPayloadChanged: _onPayloadChanged,
    );
  }
}

class _HeadingEditor extends StatefulWidget {
  const _HeadingEditor({required this.block, required this.onChanged});

  final BlogBlock block;
  final ValueChanged<BlogBlock> onChanged;

  @override
  State<_HeadingEditor> createState() => _HeadingEditorState();
}

class _HeadingEditorState extends State<_HeadingEditor> {
  late final TextEditingController _text;
  late int _level;

  @override
  void initState() {
    super.initState();
    _text = TextEditingController(text: widget.block.payload['text']?.toString() ?? '');
    _level = (widget.block.payload['level'] as num?)?.toInt() ?? 2;
    if (_level != 2 && _level != 3) _level = 2;
  }

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  void _emit() {
    final payload = Map<String, dynamic>.from(widget.block.payload)
      ..['text'] = _text.text
      ..['level'] = _level;
    widget.onChanged(widget.block.copyWith(payload: payload));
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AuthTextField(
          controller: _text,
          label: 'Sub-heading',
          textCapitalization: TextCapitalization.sentences,
          onChanged: (_) => _emit(),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            ChoiceChip(
              label: const Text('H2'),
              selected: _level == 2,
              onSelected: (_) {
                setState(() => _level = 2);
                _emit();
              },
            ),
            const SizedBox(width: 8),
            ChoiceChip(
              label: const Text('H3'),
              selected: _level == 3,
              onSelected: (_) {
                setState(() => _level = 3);
                _emit();
              },
            ),
            const Spacer(),
            Text(
              'Level $_level',
              style: GoogleFonts.inter(fontSize: 11, color: colors.mutedForeground),
            ),
          ],
        ),
      ],
    );
  }
}

class _PartitionPreview extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: DashedDividerLine(color: context.appColors.border),
    );
  }
}

class _CodeEditor extends StatefulWidget {
  const _CodeEditor({required this.block, required this.onChanged});

  final BlogBlock block;
  final ValueChanged<BlogBlock> onChanged;

  @override
  State<_CodeEditor> createState() => _CodeEditorState();
}

class _CodeEditorState extends State<_CodeEditor> {
  late final TextEditingController _code;
  late String _language;

  @override
  void initState() {
    super.initState();
    final p = widget.block.payload;
    _code = TextEditingController(
      text: p['code']?.toString() ?? p['text']?.toString() ?? '',
    );
    _language = p['language']?.toString() ?? 'plaintext';
  }

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  void _emit() {
    final payload = Map<String, dynamic>.from(widget.block.payload)
      ..['code'] = _code.text
      ..['language'] = _language
      ..['languageSource'] = 'manual';
    widget.onChanged(widget.block.copyWith(payload: payload));
  }

  Future<void> _openLanguageSheet() async {
    final language = _isKnownCodeLanguage(_language) ? _language : 'plaintext';
    final picked = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => _CodeLanguageSheet(
        selectedId: language,
        options: _codeLanguageOptions,
      ),
    );
    if (!mounted || picked == null) return;
    setState(() => _language = picked);
    _emit();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final language = _isKnownCodeLanguage(_language) ? _language : 'plaintext';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Material(
          color: colors.card,
          shape: RoundedRectangleBorder(
            side: BorderSide(color: colors.border, width: 2),
          ),
          child: InkWell(
            onTap: _openLanguageSheet,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _codeLanguageLabel(language),
                      style: GoogleFonts.inter(fontSize: 13, color: colors.foreground),
                    ),
                  ),
                  Icon(Icons.expand_more_rounded, color: colors.mutedForeground),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        AuthTextField(
          controller: _code,
          label: 'Code',
          hintText: 'Code',
          showFieldLabel: false,
          showCounter: false,
          minLines: 6,
          maxLines: null,
          autocorrect: false,
          onChanged: (_) => _emit(),
        ),
      ],
    );
  }
}

class _CodeLanguageSheet extends StatefulWidget {
  const _CodeLanguageSheet({
    required this.selectedId,
    required this.options,
  });

  final String selectedId;
  final List<_CodeLanguageOption> options;

  @override
  State<_CodeLanguageSheet> createState() => _CodeLanguageSheetState();
}

class _CodeLanguageSheetState extends State<_CodeLanguageSheet> {
  late final TextEditingController _query;
  var _searched = false;
  List<_CodeLanguageOption> _results = const [];

  bool get _canSearch => _query.text.trim().length >= 3;

  @override
  void initState() {
    super.initState();
    _query = TextEditingController()..addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  void _search() {
    final q = _query.text.trim().toLowerCase();
    if (!_canSearch) return;
    setState(() {
      _searched = true;
      _results = widget.options
          .where(
            (option) =>
                option.id.toLowerCase().contains(q) || option.label.toLowerCase().contains(q),
          )
          .toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    final listHeight = MediaQuery.sizeOf(context).height * 0.45;

    return Padding(
      padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'LANGUAGE',
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
                  autofocus: true,
                  textInputAction: TextInputAction.search,
                  decoration: const InputDecoration(
                    hintText: 'Search languages…',
                    prefixIcon: Icon(Icons.search, size: 20),
                  ),
                  onSubmitted: (_) {
                    if (_canSearch) _search();
                  },
                ),
              ),
              const SizedBox(width: 8),
              AuthButton(
                label: 'Go',
                expand: false,
                onPressed: _canSearch ? _search : null,
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: listHeight,
            child: _results.isEmpty
                ? Center(
                    child: Text(
                      _searched
                          ? 'No languages found'
                          : _canSearch
                              ? 'Tap Go to search'
                              : 'Enter at least 3 letters',
                      style: GoogleFonts.inter(fontSize: 12, color: colors.mutedForeground),
                    ),
                  )
                : ListView.separated(
                    itemCount: _results.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 4),
                    itemBuilder: (context, index) {
                      final option = _results[index];
                      final selected = option.id == widget.selectedId;
                      return Material(
                        color: selected ? colors.primary.withValues(alpha: 0.12) : colors.muted.withValues(alpha: 0.15),
                        child: InkWell(
                          onTap: () => Navigator.pop(context, option.id),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    option.label,
                                    style: GoogleFonts.inter(
                                      fontSize: 13,
                                      fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                                      color: selected ? colors.primary : colors.foreground,
                                    ),
                                  ),
                                ),
                                if (selected)
                                  Icon(Icons.check_rounded, size: 18, color: colors.primary),
                              ],
                            ),
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

class _ImageEditor extends StatefulWidget {
  const _ImageEditor({required this.block, required this.onChanged});

  final BlogBlock block;
  final ValueChanged<BlogBlock> onChanged;

  @override
  State<_ImageEditor> createState() => _ImageEditorState();
}

class _ImageEditorState extends State<_ImageEditor> {
  late String _layout;
  String? _error;

  @override
  void initState() {
    super.initState();
    _layout = coerceBlogImageLayout(widget.block.payload['layout']?.toString());
  }

  Future<void> _pickImage() async {
    setState(() => _error = null);
    final result = await pickGalleryImageBytes();
    if (!mounted) return;
    if (result.cancelled) return;
    if (result.error != null) {
      setState(() => _error = formatUserMessage(result.error!));
      return;
    }
    final fileName = result.fileName ?? 'blog-image.jpg';
    final payload = Map<String, dynamic>.from(widget.block.payload)
      ..['layout'] = _layout;
    widget.onChanged(
      widget.block.copyWith(
        payload: payload,
        pendingImageBytes: result.bytes,
        pendingImageFileName: fileName,
      ),
    );
  }

  void _emitLayout() {
    final payload = Map<String, dynamic>.from(widget.block.payload)..['layout'] = _layout;
    widget.onChanged(widget.block.copyWith(payload: payload));
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final url = widget.block.payload['url']?.toString();
    final resolved = url != null && url.isNotEmpty ? resolveProfileMediaUrl(url) : null;
    final bytes = widget.block.pendingImageBytes;
    final hasImage = bytes != null || (resolved != null && resolved.isNotEmpty);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(_error!, style: TextStyle(color: colors.destructive, fontSize: 12)),
          ),
        if (bytes != null)
          BlogImageLayoutFrame(
            layout: _layout,
            child: Image.memory(
              bytes,
              width: double.infinity,
              height: double.infinity,
              fit: blogImageFitForLayout(_layout),
            ),
          )
        else if (resolved != null && resolved.isNotEmpty)
          BlogImageLayoutFrame(
            layout: _layout,
            child: Image.network(
              resolved,
              width: double.infinity,
              height: double.infinity,
              fit: blogImageFitForLayout(_layout),
            ),
          )
        else
          ImageUploadPickZone(
            onTap: _pickImage,
            prompt: 'Upload image or GIF',
            hint: 'JPEG · PNG · GIF · WEBP',
          ),
        if (hasImage) ...[
          const SizedBox(height: 8),
          TextButton.icon(
            onPressed: _pickImage,
            icon: const Icon(Icons.photo_library_outlined, size: 16),
            label: const Text('Choose another'),
          ),
        ],
        const SizedBox(height: 8),
        BlogImageLayoutChips(
          selected: _layout,
          onSelected: (layout) {
            setState(() => _layout = layout);
            _emitLayout();
          },
        ),
      ],
    );
  }
}

class _VideoEmbedEditor extends StatefulWidget {
  const _VideoEmbedEditor({required this.block, required this.onChanged});

  final BlogBlock block;
  final ValueChanged<BlogBlock> onChanged;

  @override
  State<_VideoEmbedEditor> createState() => _VideoEmbedEditorState();
}

class _VideoEmbedEditorState extends State<_VideoEmbedEditor> {
  static const _maxVideos = 3;
  late final List<TextEditingController> _urls;
  var _tabIndex = 0;
  String _layout = 'row';
  String _size = 'md';

  @override
  void initState() {
    super.initState();
    final videos = widget.block.payload['videos'];
    final initial = <String>[];
    if (videos is List) {
      for (final v in videos) {
        final s = v.toString().trim();
        if (s.isNotEmpty) initial.add(s);
      }
    }
    final legacy = widget.block.payload['url']?.toString().trim();
    if (legacy != null && legacy.isNotEmpty && !initial.contains(legacy)) {
      initial.insert(0, legacy);
    }
    if (initial.isEmpty) initial.add('');
    _urls = [
      for (final value in initial.take(_maxVideos))
        TextEditingController(text: value),
    ];
    _layout = widget.block.payload['layout']?.toString() == 'column' ? 'column' : 'row';
    final rawSize = widget.block.payload['size']?.toString();
    _size = rawSize == 'sm' || rawSize == 'lg' ? rawSize! : 'md';
  }

  @override
  void dispose() {
    for (final c in _urls) {
      c.dispose();
    }
    super.dispose();
  }

  List<String> get _previewEmbeds {
    final embeds = <String>[];
    for (final c in _urls) {
      final raw = c.text.trim();
      if (raw.isEmpty) continue;
      final result = normalizeVideoEmbedUrl(raw);
      if (result.embedUrl != null) embeds.add(result.embedUrl!);
    }
    return embeds;
  }

  String get _effectiveLayout => _previewEmbeds.length < 2 ? 'row' : _layout;

  String get _displaySize => clampVideoEmbedSize(
        videoCount: _previewEmbeds.length,
        size: _size,
        layout: _effectiveLayout,
      );

  bool get _canPreview => _previewEmbeds.isNotEmpty;

  void _emit() {
    final embeds = _previewEmbeds;
    final payload = Map<String, dynamic>.from(widget.block.payload);
    if (embeds.isEmpty) {
      payload.remove('videos');
      payload.remove('url');
    } else {
      payload['videos'] = embeds;
      payload['url'] = embeds.first;
      payload['layout'] = embeds.length < 2 ? 'row' : _layout;
      payload['size'] = _displaySize;
    }
    widget.onChanged(widget.block.copyWith(payload: payload));
    if (!_canPreview && _tabIndex == 1) {
      setState(() => _tabIndex = 0);
    }
  }

  void _setLayout(String layout) {
    setState(() => _layout = layout);
    _emit();
  }

  void _setSize(String size) {
    setState(() => _size = size);
    _emit();
  }

  void _addVideoSlot() {
    if (_urls.length >= _maxVideos) return;
    setState(() => _urls.add(TextEditingController()));
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final canPreview = _canPreview;
    final previewCount = _previewEmbeds.length;
    final showLayoutPicker = previewCount >= 2;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            _TableTabButton(
              label: 'Edit',
              selected: _tabIndex == 0,
              onTap: () => setState(() => _tabIndex = 0),
            ),
            const SizedBox(width: 8),
            _TableTabButton(
              label: 'Preview',
              selected: _tabIndex == 1,
              enabled: canPreview,
              onTap: canPreview ? () => setState(() => _tabIndex = 1) : null,
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (_tabIndex == 0) ...[
          for (var i = 0; i < _urls.length; i++) ...[
            TextField(
              controller: _urls[i],
              keyboardType: TextInputType.url,
              autocorrect: false,
              enableSuggestions: false,
              style: GoogleFonts.inter(fontSize: 12, color: colors.foreground),
              decoration: InputDecoration(
                hintText: 'Video URL ${i + 1}',
                filled: true,
                fillColor: colors.muted.withValues(alpha: 0.18),
                border: OutlineInputBorder(borderSide: BorderSide(color: colors.border)),
                enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: colors.border)),
                focusedBorder: OutlineInputBorder(borderSide: BorderSide(color: colors.primary)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              ),
              onChanged: (_) => setState(_emit),
            ),
            const SizedBox(height: 8),
          ],
          if (_urls.length < _maxVideos)
            TextButton.icon(
              onPressed: _addVideoSlot,
              icon: const Icon(Icons.upload_rounded, size: 18),
              label: Text(
                'Another Video',
                style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ),
          const SizedBox(height: 8),
          Text(
            'Preview size',
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.6,
              color: colors.mutedForeground,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              for (final option in const [
                ('sm', 'S'),
                ('md', 'M'),
                ('lg', 'L'),
              ]) ...[
                if (option.$1 != 'sm') const SizedBox(width: 8),
                Expanded(
                  child: _VideoSizeChip(
                    label: option.$2,
                    selected: _displaySize == option.$1,
                    enabled: !videoEmbedSizeDisabled(
                      option: option.$1,
                      videoCount: previewCount,
                      layout: _effectiveLayout,
                    ),
                    onTap: () => _setSize(option.$1),
                  ),
                ),
              ],
            ],
          ),
          if (showLayoutPicker) ...[
            const SizedBox(height: 8),
            Text(
              'Layout',
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.6,
                color: colors.mutedForeground,
              ),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: _VideoSizeChip(
                    label: 'Row',
                    selected: _layout == 'row',
                    enabled: true,
                    onTap: () => _setLayout('row'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _VideoSizeChip(
                    label: 'Column',
                    selected: _layout == 'column',
                    enabled: true,
                    onTap: () => _setLayout('column'),
                  ),
                ),
              ],
            ),
          ],
        ] else ...[
          DecoratedBox(
            decoration: BoxDecoration(
              border: Border.all(color: colors.border),
              color: colors.muted.withValues(alpha: 0.12),
            ),
            child: ClipRect(
              child: SizedBox(
                width: double.infinity,
                height: 220,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(12),
                  child: _effectiveLayout == 'column'
                      ? Column(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            for (final embed in _previewEmbeds) ...[
                              _VideoThumbnailPreview(
                                embedUrl: embed,
                                size: _displaySize,
                              ),
                              const SizedBox(height: 8),
                            ],
                          ],
                        )
                      : Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          alignment: WrapAlignment.center,
                          children: [
                            for (final embed in _previewEmbeds)
                              _VideoThumbnailPreview(
                                embedUrl: embed,
                                size: _displaySize,
                              ),
                          ],
                        ),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _VideoSizeChip extends StatelessWidget {
  const _VideoSizeChip({
    required this.label,
    required this.selected,
    required this.enabled,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final foreground = selected ? colors.primary : colors.foreground;
    return Material(
      color: selected ? colors.primary.withValues(alpha: 0.12) : colors.muted.withValues(alpha: 0.2),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.zero,
        side: BorderSide(
          color: selected ? colors.primary : colors.border,
          width: 1.5,
        ),
      ),
      child: InkWell(
        onTap: enabled ? onTap : null,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Center(
            child: Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: enabled ? foreground : colors.mutedForeground,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _VideoThumbnailPreview extends StatelessWidget {
  const _VideoThumbnailPreview({
    required this.embedUrl,
    required this.size,
  });

  final String embedUrl;
  final String size;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final width = videoEmbedPreviewWidth(size);
    final thumb = youtubeThumbnailUrl(embedUrl);

    return SizedBox(
      width: width,
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: DecoratedBox(
          decoration: BoxDecoration(
            border: Border.all(color: colors.border),
            color: colors.card,
          ),
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (thumb != null)
                Image.network(
                  thumb,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => _VideoThumbFallback(colors: colors),
                )
              else
                _VideoThumbFallback(colors: colors),
              Center(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: colors.background.withValues(alpha: 0.55),
                    border: Border.all(color: colors.border),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(8),
                    child: Icon(
                      Icons.play_arrow_rounded,
                      color: colors.foreground,
                      size: size == 'sm' ? 22 : 28,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _VideoThumbFallback extends StatelessWidget {
  const _VideoThumbFallback({required this.colors});

  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: colors.muted.withValues(alpha: 0.35),
      child: Center(
        child: Icon(Icons.videocam_outlined, color: colors.mutedForeground, size: 28),
      ),
    );
  }
}

class _GithubRepoEditor extends StatefulWidget {
  const _GithubRepoEditor({required this.block, required this.onChanged});

  final BlogBlock block;
  final ValueChanged<BlogBlock> onChanged;

  @override
  State<_GithubRepoEditor> createState() => _GithubRepoEditorState();
}

class _GithubRepoEditorState extends State<_GithubRepoEditor> {
  late final TextEditingController _url;

  @override
  void initState() {
    super.initState();
    _url = TextEditingController(text: widget.block.payload['url']?.toString() ?? '');
  }

  @override
  void dispose() {
    _url.dispose();
    super.dispose();
  }

  void _emitFromUrl(String value) {
    final parsed = parseGithubRepoUrl(value);
    final payload = Map<String, dynamic>.from(widget.block.payload);
    payload.remove('description');
    if (parsed.isValid) {
      payload['owner'] = parsed.owner;
      payload['repo'] = parsed.repo;
      payload['url'] = parsed.url;
      payload['name'] = '${parsed.owner}/${parsed.repo}';
    } else {
      payload.remove('owner');
      payload.remove('repo');
      payload.remove('name');
      payload.remove('url');
    }
    widget.onChanged(widget.block.copyWith(payload: payload));
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final owner = widget.block.payload['owner']?.toString();
    final repo = widget.block.payload['repo']?.toString();
    final urlText = _url.text.trim();
    final showUrlError = urlText.isNotEmpty && (owner == null || repo == null);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AuthTextField(
          controller: _url,
          label: 'GitHub repository URL',
          hintText: 'https://github.com/owner/repo',
          keyboardType: TextInputType.url,
          autocorrect: false,
          onChanged: _emitFromUrl,
        ),
        if (showUrlError) ...[
          const SizedBox(height: 6),
          Text(
            'Enter a valid GitHub repo URL (https://github.com/owner/repo)',
            style: GoogleFonts.inter(fontSize: 11, color: colors.destructive),
          ),
        ],
        if (owner != null && repo != null) ...[
          const SizedBox(height: 8),
          Text(
            'Linked: $owner/$repo',
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: colors.primary,
            ),
          ),
        ],
      ],
    );
  }
}

class _TableEditor extends StatefulWidget {
  const _TableEditor({required this.block, required this.onChanged});

  final BlogBlock block;
  final ValueChanged<BlogBlock> onChanged;

  @override
  State<_TableEditor> createState() => _TableEditorState();
}

class _TableEditorState extends State<_TableEditor> {
  late List<List<String>> _rows;
  var _tabIndex = 0;
  int? _highlightRow;
  int? _highlightCol;

  @override
  void initState() {
    super.initState();
    _rows = clampTableMatrix(_parseRows(widget.block.payload['rows']));
  }

  List<List<String>> _parseRows(dynamic raw) {
    if (raw is! List) return [['', '', ''], ['', '', '']];
    return raw
        .map((row) {
          if (row is List) return row.map((c) => c.toString()).toList();
          return [''];
        })
        .toList();
  }

  void _emit() {
    _rows = clampTableMatrix(_rows);
    final payload = Map<String, dynamic>.from(widget.block.payload)..['rows'] = _rows;
    widget.onChanged(widget.block.copyWith(payload: payload));
  }

  void _updateCell(int r, int c, String value) {
    setState(() {
      _rows[r][c] = value.length > maxTableCellChars
          ? value.substring(0, maxTableCellChars)
          : value;
      if (!tableHasContent(_rows) && _tabIndex == 1) {
        _tabIndex = 0;
      }
    });
    _emit();
  }

  void _addRow() {
    if (_rows.length >= maxTableRows) return;
    setState(() {
      final cols = _rows.isEmpty ? 3 : _rows.first.length;
      _rows.add(List.filled(cols, ''));
    });
    _emit();
  }

  void _addColumn() {
    if (_rows.isNotEmpty && _rows.first.length >= maxTableCols) return;
    setState(() {
      if (_rows.isEmpty) _rows = [['', '', '']];
      for (final row in _rows) {
        row.add('');
      }
    });
    _emit();
  }

  void _deleteRow(int index) {
    if (_rows.length <= 1) return;
    setState(() {
      _rows.removeAt(index);
      _highlightRow = null;
      _highlightCol = null;
      if (!tableHasContent(_rows) && _tabIndex == 1) {
        _tabIndex = 0;
      }
    });
    _emit();
  }

  void _deleteColumn(int index) {
    if (_rows.isEmpty || _rows.first.length <= 1) return;
    setState(() {
      for (final row in _rows) {
        if (index < row.length) row.removeAt(index);
      }
      _highlightRow = null;
      _highlightCol = null;
      if (!tableHasContent(_rows) && _tabIndex == 1) {
        _tabIndex = 0;
      }
    });
    _emit();
  }

  Future<void> _showCellActions(BuildContext context, int row, int col) async {
    final colCount = _rows.isEmpty ? 0 : _rows.first.length;
    setState(() {
      _highlightRow = row;
      _highlightCol = col;
    });

    final canDeleteRow = _rows.length > 1;
    final canDeleteCol = colCount > 1;

    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) {
        final sheetColors = sheetContext.appColors;
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                child: Text(
                  'Row ${row + 1} · Column ${col + 1}',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: sheetColors.mutedForeground,
                  ),
                ),
              ),
              ListTile(
                leading: Icon(
                  Icons.view_agenda_outlined,
                  color: canDeleteRow ? sheetColors.destructive : sheetColors.mutedForeground,
                ),
                title: Text('Delete row ${row + 1}'),
                enabled: canDeleteRow,
                onTap: canDeleteRow
                    ? () {
                        Navigator.of(sheetContext).pop();
                        _deleteRow(row);
                      }
                    : null,
              ),
              ListTile(
                leading: Icon(
                  Icons.view_week_outlined,
                  color: canDeleteCol ? sheetColors.destructive : sheetColors.mutedForeground,
                ),
                title: Text('Delete column ${col + 1}'),
                enabled: canDeleteCol,
                onTap: canDeleteCol
                    ? () {
                        Navigator.of(sheetContext).pop();
                        _deleteColumn(col);
                      }
                    : null,
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );

    if (mounted) {
      setState(() {
        _highlightRow = null;
        _highlightCol = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final canPreview = tableHasContent(_rows);
    final colCount = _rows.isEmpty ? 0 : _rows.first.length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            _TableTabButton(
              label: 'Edit Grid',
              selected: _tabIndex == 0,
              onTap: () => setState(() => _tabIndex = 0),
            ),
            const SizedBox(width: 8),
            _TableTabButton(
              label: 'Preview',
              selected: _tabIndex == 1,
              enabled: canPreview,
              onTap: canPreview ? () => setState(() => _tabIndex = 1) : null,
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (_tabIndex == 0) ...[
          LayoutBuilder(
            builder: (context, constraints) {
              return DecoratedBox(
                decoration: BoxDecoration(
                  border: Border.all(color: colors.border),
                  color: colors.muted.withValues(alpha: 0.12),
                ),
                child: ClipRect(
                  child: SizedBox(
                    width: constraints.maxWidth,
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: ConstrainedBox(
                        constraints: BoxConstraints(minWidth: constraints.maxWidth),
                        child: Padding(
                          padding: const EdgeInsets.all(8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              for (var r = 0; r < _rows.length; r++)
                                Padding(
                                  padding: EdgeInsets.only(bottom: r < _rows.length - 1 ? 8 : 0),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      for (var c = 0; c < _rows[r].length; c++)
                                        Padding(
                                          padding: EdgeInsets.only(
                                            right: c < _rows[r].length - 1 ? 6 : 0,
                                          ),
                                          child: _TableGridCell(
                                            row: r,
                                            col: c,
                                            value: _rows[r][c],
                                            highlighted: _highlightRow == r || _highlightCol == c,
                                            onCoordLongPress: () => _showCellActions(context, r, c),
                                            onChanged: (v) => _updateCell(r, c, v),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
          Row(
            children: [
              TextButton.icon(
                onPressed: _rows.length < maxTableRows ? _addRow : null,
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Row'),
              ),
              TextButton.icon(
                onPressed: colCount < maxTableCols ? _addColumn : null,
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Column'),
              ),
              const Spacer(),
              Text(
                '${_rows.length}×$colCount',
                style: GoogleFonts.inter(fontSize: 11, color: colors.mutedForeground),
              ),
            ],
          ),
        ] else ...[
          LayoutBuilder(
            builder: (context, constraints) {
              final previewCols = tableEffectiveColCount(_rows);
              return ColoredBox(
                color: colors.muted.withValues(alpha: 0.12),
                child: SizedBox(
                  width: constraints.maxWidth,
                  child: Table(
                    columnWidths: {
                      for (var ci = 0; ci < previewCols; ci++) ci: const FlexColumnWidth(1),
                    },
                    defaultVerticalAlignment: TableCellVerticalAlignment.top,
                    border: TableBorder.all(color: Colors.transparent, width: 0),
                    children: [
                      for (var ri = 0; ri < _rows.length; ri++)
                        TableRow(
                          decoration: ri == 0
                              ? BoxDecoration(color: colors.muted.withValues(alpha: 0.35))
                              : null,
                          children: [
                            for (var ci = 0; ci < previewCols; ci++)
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                child: Text(
                                  ci < _rows[ri].length ? _rows[ri][ci] : '',
                                  maxLines: 3,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: ri == 0 ? FontWeight.w700 : FontWeight.w400,
                                    color: colors.foreground,
                                  ),
                                ),
                              ),
                          ],
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ],
    );
  }
}

class _TableGridCell extends StatelessWidget {
  const _TableGridCell({
    required this.row,
    required this.col,
    required this.value,
    required this.highlighted,
    required this.onCoordLongPress,
    required this.onChanged,
  });

  final int row;
  final int col;
  final String value;
  final bool highlighted;
  final VoidCallback onCoordLongPress;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final coord = 'R${row + 1}C${col + 1}';
    return SizedBox(
      width: 112,
      height: 76,
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border.all(
            color: highlighted ? colors.primary : colors.border,
            width: highlighted ? 2 : 1,
          ),
          color: highlighted ? colors.primary.withValues(alpha: 0.1) : colors.card,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            GestureDetector(
              onLongPress: onCoordLongPress,
              behavior: HitTestBehavior.opaque,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 5, 8, 0),
                child: Text(
                  coord,
                  style: GoogleFonts.inter(
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.3,
                    color: highlighted ? colors.primary : colors.mutedForeground,
                  ),
                ),
              ),
            ),
            Expanded(
              child: TextFormField(
                key: ValueKey(coord),
                initialValue: value,
                maxLength: maxTableCellChars,
                maxLines: 2,
                style: GoogleFonts.inter(fontSize: 12, color: colors.foreground),
                decoration: InputDecoration(
                  isDense: true,
                  isCollapsed: true,
                  counterText: '',
                  hintText: coord,
                  hintStyle: GoogleFonts.inter(fontSize: 12, color: colors.mutedForeground),
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  contentPadding: const EdgeInsets.fromLTRB(8, 4, 8, 6),
                ),
                onChanged: onChanged,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TableTabButton extends StatelessWidget {
  const _TableTabButton({
    required this.label,
    required this.selected,
    required this.onTap,
    this.enabled = true,
  });

  final String label;
  final bool selected;
  final bool enabled;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return TextButton(
      onPressed: enabled ? onTap : null,
      style: TextButton.styleFrom(
        foregroundColor: selected ? colors.primary : colors.mutedForeground,
        backgroundColor: selected ? colors.primary.withValues(alpha: 0.12) : Colors.transparent,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      ),
      child: Text(
        label,
        style: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}

class _MermaidEditor extends StatefulWidget {
  const _MermaidEditor({required this.block, required this.onChanged});

  final BlogBlock block;
  final ValueChanged<BlogBlock> onChanged;

  @override
  State<_MermaidEditor> createState() => _MermaidEditorState();
}

class _MermaidEditorState extends State<_MermaidEditor> {
  static const _defaultSource = '''graph TD
    A[Client App] --> B[API]
    B --> C[Database]''';

  late final TextEditingController _source;
  var _tabIndex = 0;
  String? _parseError;
  Timer? _validateTimer;

  @override
  void initState() {
    super.initState();
    final raw = widget.block.payload['source']?.toString() ?? '';
    _source = TextEditingController(text: raw.trim().isEmpty ? _defaultSource : raw);
    _source.addListener(_onSourceChanged);
    _scheduleValidation();
  }

  void _onSourceChanged() {
    final payload = Map<String, dynamic>.from(widget.block.payload)..['source'] = _source.text;
    widget.onChanged(widget.block.copyWith(payload: payload));
    _scheduleValidation();
  }

  void _scheduleValidation() {
    _validateTimer?.cancel();
    _validateTimer = Timer(const Duration(milliseconds: 450), () {
      if (!mounted) return;
      setState(() {
        _parseError = validateMermaidSourceHeuristic(_source.text);
        if (!mermaidSourceCanPreview(_source.text, parseError: _parseError) && _tabIndex == 1) {
          _tabIndex = 0;
        }
      });
    });
  }

  @override
  void dispose() {
    _validateTimer?.cancel();
    _source.removeListener(_onSourceChanged);
    _source.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final canPreview = mermaidSourceCanPreview(_source.text, parseError: _parseError);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            _TableTabButton(
              label: 'Edit',
              selected: _tabIndex == 0,
              onTap: () => setState(() => _tabIndex = 0),
            ),
            const SizedBox(width: 8),
            _TableTabButton(
              label: 'Preview',
              selected: _tabIndex == 1,
              enabled: canPreview,
              onTap: canPreview ? () => setState(() => _tabIndex = 1) : null,
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (_tabIndex == 0) ...[
          TextField(
            controller: _source,
            minLines: 8,
            maxLines: 14,
            autocorrect: false,
            enableSuggestions: false,
            style: GoogleFonts.robotoMono(fontSize: 12, color: colors.foreground),
            decoration: InputDecoration(
              hintText: 'graph TD ...',
              filled: true,
              fillColor: colors.muted.withValues(alpha: 0.18),
              border: OutlineInputBorder(borderSide: BorderSide(color: colors.border)),
              enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: colors.border)),
              focusedBorder: OutlineInputBorder(borderSide: BorderSide(color: colors.primary)),
              errorBorder: OutlineInputBorder(borderSide: BorderSide(color: colors.destructive)),
              focusedErrorBorder: OutlineInputBorder(borderSide: BorderSide(color: colors.destructive)),
              contentPadding: const EdgeInsets.all(12),
            ),
          ),
          if (_parseError != null) ...[
            const SizedBox(height: 8),
            Text(
              _parseError!,
              style: GoogleFonts.inter(fontSize: 11, color: colors.destructive),
            ),
          ],
        ] else ...[
          DecoratedBox(
            decoration: BoxDecoration(
              border: Border.all(color: colors.border),
              color: colors.muted.withValues(alpha: 0.12),
            ),
            child: ClipRect(
              child: SizedBox(
                width: double.infinity,
                height: 220,
                child: MermaidPreviewPanel(
                  key: ValueKey(widget.block.id),
                  source: _source.text,
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
