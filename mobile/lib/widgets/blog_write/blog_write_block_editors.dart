import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/blog_block.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/gallery_image_picker.dart';
import '../../utils/github_repo_utils.dart';
import '../../utils/resolve_profile_media_url.dart';
import '../../utils/upload_image_alt.dart';
import '../../utils/user_message_case.dart';
import '../../utils/video_embed_utils.dart';
import '../auth/auth_text_field.dart';
import '../ui/dashed_border_box.dart';
import '../ui/image_upload_crop_dialog.dart';
import 'blog_image_layout_chips.dart';
import 'rich_paragraph_editor.dart';
import 'unsplash_block_editor.dart';

const _codeLanguages = [
  'plaintext',
  'dart',
  'javascript',
  'typescript',
  'python',
  'java',
  'go',
  'rust',
  'sql',
  'bash',
  'json',
  'yaml',
  'html',
  'css',
];

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

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final language = _codeLanguages.contains(_language) ? _language : 'plaintext';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        DropdownButtonFormField<String>(
          initialValue: language,
          isExpanded: true,
          decoration: InputDecoration(
            labelText: null,
            floatingLabelBehavior: FloatingLabelBehavior.never,
            border: OutlineInputBorder(borderSide: BorderSide(color: colors.border, width: 2)),
            enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: colors.border, width: 2)),
            focusedBorder: OutlineInputBorder(borderSide: BorderSide(color: colors.primary, width: 2)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          ),
          items: [
            for (final lang in _codeLanguages)
              DropdownMenuItem(value: lang, child: Text(lang)),
          ],
          onChanged: (v) {
            if (v == null) return;
            setState(() => _language = v);
            _emit();
          },
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
    final deviceLabel = await resolveMobileDeviceLabel();
    if (!mounted) return;
    final alt = blogImageAltFromPick(deviceLabel: deviceLabel, fileName: fileName);
    final payload = Map<String, dynamic>.from(widget.block.payload)
      ..['title'] = alt
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
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: Image.memory(bytes, height: 160, width: double.infinity, fit: BoxFit.cover),
          )
        else if (resolved != null && resolved.isNotEmpty)
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: Image.network(resolved, height: 160, width: double.infinity, fit: BoxFit.cover),
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
    while (initial.length < 2) {
      initial.add('');
    }
    _urls = [
      for (final value in initial.take(_maxVideos))
        TextEditingController(text: value),
    ];
  }

  @override
  void dispose() {
    for (final c in _urls) {
      c.dispose();
    }
    super.dispose();
  }

  void _emit() {
    final embeds = <String>[];
    for (final c in _urls) {
      final raw = c.text.trim();
      if (raw.isEmpty) continue;
      final result = normalizeVideoEmbedUrl(raw);
      if (result.embedUrl != null) embeds.add(result.embedUrl!);
    }
    final payload = Map<String, dynamic>.from(widget.block.payload);
    if (embeds.isEmpty) {
      payload.remove('videos');
      payload.remove('url');
    } else {
      payload['videos'] = embeds;
      payload['url'] = embeds.first;
      payload['layout'] = payload['layout'] ?? 'column';
      payload['size'] = payload['size'] ?? 'md';
    }
    widget.onChanged(widget.block.copyWith(payload: payload));
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Paste YouTube, Loom, or other embed URLs (up to $_maxVideos).',
          style: GoogleFonts.inter(fontSize: 12, color: context.appColors.mutedForeground),
        ),
        const SizedBox(height: 8),
        for (var i = 0; i < _urls.length; i++) ...[
          AuthTextField(
            controller: _urls[i],
            label: 'Video URL ${i + 1}',
            keyboardType: TextInputType.url,
            autocorrect: false,
            onChanged: (_) => _emit(),
          ),
          const SizedBox(height: 8),
        ],
        if (_urls.length < _maxVideos)
          TextButton.icon(
            onPressed: () => setState(() => _urls.add(TextEditingController())),
            icon: const Icon(Icons.add, size: 18),
            label: const Text('Add another video'),
          ),
      ],
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
  late final TextEditingController _description;

  @override
  void initState() {
    super.initState();
    _url = TextEditingController(text: widget.block.payload['url']?.toString() ?? '');
    _description = TextEditingController(text: widget.block.payload['description']?.toString() ?? '');
  }

  @override
  void dispose() {
    _url.dispose();
    _description.dispose();
    super.dispose();
  }

  void _emitFromUrl(String value) {
    final parsed = parseGithubRepoUrl(value);
    final payload = Map<String, dynamic>.from(widget.block.payload);
    if (parsed.isValid) {
      payload['owner'] = parsed.owner;
      payload['repo'] = parsed.repo;
      payload['url'] = parsed.url;
      payload['name'] = '${parsed.owner}/${parsed.repo}';
    } else {
      payload.remove('owner');
      payload.remove('repo');
      payload.remove('name');
      payload['url'] = value.trim();
    }
    widget.onChanged(widget.block.copyWith(payload: payload));
  }

  @override
  Widget build(BuildContext context) {
    final owner = widget.block.payload['owner']?.toString();
    final repo = widget.block.payload['repo']?.toString();
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
        if (owner != null && repo != null) ...[
          const SizedBox(height: 8),
          Text(
            'Linked: $owner/$repo',
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: context.appColors.primary,
            ),
          ),
        ],
        const SizedBox(height: 8),
        AuthTextField(
          controller: _description,
          label: 'Description (optional)',
          minLines: 2,
          maxLines: 3,
          onChanged: (v) {
            final payload = Map<String, dynamic>.from(widget.block.payload)..['description'] = v.trim();
            widget.onChanged(widget.block.copyWith(payload: payload));
          },
        ),
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

  @override
  void initState() {
    super.initState();
    _rows = _parseRows(widget.block.payload['rows']);
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
    final payload = Map<String, dynamic>.from(widget.block.payload)..['rows'] = _rows;
    widget.onChanged(widget.block.copyWith(payload: payload));
  }

  void _updateCell(int r, int c, String value) {
    setState(() {
      _rows[r][c] = value;
    });
    _emit();
  }

  void _addRow() {
    setState(() {
      final cols = _rows.isEmpty ? 3 : _rows.first.length;
      _rows.add(List.filled(cols, ''));
    });
    _emit();
  }

  void _addColumn() {
    setState(() {
      if (_rows.isEmpty) _rows = [['', '', '']];
      for (final row in _rows) {
        row.add('');
      }
    });
    _emit();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var r = 0; r < _rows.length; r++)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (var c = 0; c < _rows[r].length; c++)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: TextFormField(
                        initialValue: _rows[r][c],
                        decoration: InputDecoration(
                          labelText: 'R${r + 1}C${c + 1}',
                          isDense: true,
                        ),
                        onChanged: (v) => _updateCell(r, c, v),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        Row(
          children: [
            TextButton.icon(
              onPressed: _addRow,
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Row'),
            ),
            TextButton.icon(
              onPressed: _addColumn,
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Column'),
            ),
            const Spacer(),
            Text(
              '${_rows.length} rows',
              style: GoogleFonts.inter(fontSize: 11, color: colors.mutedForeground),
            ),
          ],
        ),
      ],
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
  late final TextEditingController _source;

  @override
  void initState() {
    super.initState();
    _source = TextEditingController(text: widget.block.payload['source']?.toString() ?? '');
  }

  @override
  void dispose() {
    _source.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AuthTextField(
      controller: _source,
      label: 'Mermaid source',
      minLines: 6,
      maxLines: null,
      autocorrect: false,
      helperText: 'e.g. graph TD, flowchart, sequenceDiagram',
      onChanged: (v) {
        final payload = Map<String, dynamic>.from(widget.block.payload)..['source'] = v;
        widget.onChanged(widget.block.copyWith(payload: payload));
      },
    );
  }
}
