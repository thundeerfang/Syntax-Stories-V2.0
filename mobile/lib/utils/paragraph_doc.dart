import 'dart:convert';

/// Inline GIF marker — one object-replacement char per GIF ([ExtendedTextField] ImageSpan).
const kParagraphGifPlaceholder = '\uFFFC';

/// Inline @mention marker — private-use char (preview + TipTap round-trip).
const kParagraphMentionPlaceholder = '\uE000';

const int kParagraphMentionSlotLength = 1;

int paragraphMentionSlotEnd(String text, int index) {
  if (index < 0 ||
      index >= text.length ||
      text[index] != kParagraphMentionPlaceholder) {
    return index;
  }
  return (index + kParagraphMentionSlotLength).clamp(0, text.length);
}

int? nextParagraphInlineAtomIndex(String text, int from) {
  final gifAt = text.indexOf(kParagraphGifPlaceholder, from);
  final mentionAt = text.indexOf(kParagraphMentionPlaceholder, from);
  if (gifAt == -1 && mentionAt == -1) return null;
  if (gifAt == -1) return mentionAt;
  if (mentionAt == -1) return gifAt;
  return gifAt < mentionAt ? gifAt : mentionAt;
}

/// Display size for inline GIFs while editing (matches text line height for cursor alignment).
const double kParagraphInlineGifEditSize = 21;

/// Display size for inline GIFs in read-only preview.
const double kParagraphInlineGifPreviewSize = 48;

/// Default inline GIF size (editing).
const double kParagraphInlineGifSize = kParagraphInlineGifEditSize;

/// Full editing slot written into the text field for one inline GIF.
const kParagraphGifEditingSlot = kParagraphGifPlaceholder;

const int kParagraphGifSlotLength = kParagraphGifEditingSlot.length;

int paragraphGifSlotEnd(String text, int index) {
  if (index < 0 || index >= text.length || text[index] != kParagraphGifPlaceholder) {
    return index;
  }
  return (index + kParagraphGifSlotLength).clamp(0, text.length);
}

bool isParagraphGifSlotTailIndex(String text, int index) {
  if (index <= 0 || index >= text.length) return false;
  if (!_isLegacyGifSlotTailChar(text[index])) return false;
  for (var back = 1; back <= 2; back++) {
    final start = index - back;
    if (start < 0) break;
    if (text[start] == '\u200B') return true;
  }
  return false;
}

bool _isLegacyGifSlotTailChar(String char) =>
    char == '\u2001' || char == '\u2007' || char == '\u2002' || char == ' ';

String normalizeParagraphEditingText(String text) {
  final buffer = StringBuffer();
  var i = 0;
  while (i < text.length) {
    final char = text[i];
    if (char == kParagraphGifPlaceholder || char == '\u200B') {
      buffer.write(kParagraphGifEditingSlot);
      i++;
      while (i < text.length && _isLegacyGifSlotTailChar(text[i])) {
        i++;
      }
      continue;
    }
    buffer.write(char);
    i++;
  }
  return buffer.toString();
}

bool _safeBool(bool Function() read) {
  try {
    return read();
  } catch (_) {
    return false;
  }
}

class ParagraphGif {
  const ParagraphGif({
    required this.url,
    this.title = '',
    this.sourceUrl = '',
    this.align = 'center',
  });

  final String url;
  final String title;
  final String sourceUrl;
  final String align;

  Map<String, dynamic> toInlineGifNode() => {
        'type': 'inlineGif',
        'attrs': {
          'url': url,
          'align': align,
          'title': title,
          'sourceUrl': sourceUrl,
        },
      };

  factory ParagraphGif.fromAttrs(Map<String, dynamic>? attrs) {
    if (attrs == null) return const ParagraphGif(url: '');
    return ParagraphGif(
      url: attrs['url']?.toString() ?? '',
      title: attrs['title']?.toString() ?? '',
      sourceUrl: attrs['sourceUrl']?.toString() ?? '',
      align: attrs['align']?.toString() ?? 'center',
    );
  }
}

class ParagraphMention {
  const ParagraphMention({
    required this.username,
    this.fullName = '',
    this.profileImg = '',
  });

  final String username;
  final String fullName;
  final String profileImg;

  String get displayLabel {
    final name = fullName.trim();
    if (name.isNotEmpty) return name;
    final handle = username.trim();
    return handle.isNotEmpty ? '@$handle' : '@user';
  }

  Map<String, dynamic> toMentionNode() => {
        'type': 'mention',
        'attrs': {
          'username': username,
          'fullName': fullName,
          'profileImg': profileImg,
        },
      };

  factory ParagraphMention.fromAttrs(Map<String, dynamic>? attrs) {
    if (attrs == null) return const ParagraphMention(username: '');
    return ParagraphMention(
      username: attrs['username']?.toString() ?? '',
      fullName: attrs['fullName']?.toString() ?? '',
      profileImg: attrs['profileImg']?.toString() ?? '',
    );
  }
}

class _MarkRange {
  _MarkRange({
    required this.start,
    required this.end,
    this.bold = false,
    this.italic = false,
    this.underline = false,
    this.linkHref,
  });

  int start;
  int end;
  bool bold;
  bool italic;
  bool underline;
  String? linkHref;

  _MarkRange copy() => _MarkRange(
        start: start,
        end: end,
        bold: bold,
        italic: italic,
        underline: underline,
        linkHref: linkHref,
      );
}

class ParagraphTextStyle {
  const ParagraphTextStyle({
    this.bold = false,
    this.italic = false,
    this.underline = false,
    this.linkHref,
  });

  final bool bold;
  final bool italic;
  final bool underline;
  final String? linkHref;
}

/// TipTap-compatible paragraph document for mobile editing.
class ParagraphDoc {
  ParagraphDoc._({
    required this.editingText,
    required List<_MarkRange> marks,
    required List<ParagraphGif> gifs,
    required List<ParagraphMention> mentions,
  })  : _marks = marks,
        _gifs = gifs,
        _mentions = mentions;

  String editingText;
  final List<_MarkRange> _marks;
  final List<ParagraphGif> _gifs;
  final List<ParagraphMention> _mentions;

  bool pendingBold = false;
  bool pendingItalic = false;
  bool pendingUnderline = false;
  String? pendingLinkHref;

  factory ParagraphDoc.empty() => ParagraphDoc._(
        editingText: '',
        marks: [],
        gifs: [],
        mentions: [],
      );

  factory ParagraphDoc.fromPayload(Map<String, dynamic> payload) {
    final doc = payload['doc'];
    if (doc is Map<String, dynamic>) {
      return ParagraphDoc.fromTipTapDoc(doc);
    }
    final text = payload['text']?.toString() ?? '';
    return ParagraphDoc._(
      editingText: text,
      marks: [],
      gifs: [],
      mentions: [],
    );
  }

  factory ParagraphDoc.fromTipTapDoc(Map<String, dynamic> doc) {
    final buffer = StringBuffer();
    final marks = <_MarkRange>[];
    final gifs = <ParagraphGif>[];
    final mentions = <ParagraphMention>[];

    final content = doc['content'];
    if (content is! List) {
      return ParagraphDoc._(
        editingText: '',
        marks: marks,
        gifs: gifs,
        mentions: mentions,
      );
    }

    var paragraphIndex = 0;
    for (final block in content) {
      if (block is! Map) continue;
      if (block['type']?.toString() != 'paragraph') continue;
      final nodes = block['content'];
      if (nodes is! List) continue;

      if (paragraphIndex > 0) {
        final current = buffer.toString();
        if (current.endsWith('\n\n')) {
          // Gap already present from an empty paragraph block.
        } else if (current.endsWith('\n')) {
          buffer.write('\n');
        } else {
          buffer.write('\n\n');
        }
      }
      paragraphIndex++;

      if (nodes.isEmpty) {
        buffer.write('\n');
        continue;
      }

      for (final node in nodes) {
        if (node is! Map) continue;
        final type = node['type']?.toString();
        if (type == 'hardBreak') {
          buffer.write('\n');
          continue;
        }
        if (type == 'inlineGif') {
          buffer.write(kParagraphGifEditingSlot);
          gifs.add(ParagraphGif.fromAttrs(
            node['attrs'] is Map ? Map<String, dynamic>.from(node['attrs'] as Map) : null,
          ));
          continue;
        }
        if (type == 'mention') {
          buffer.write(kParagraphMentionPlaceholder);
          mentions.add(ParagraphMention.fromAttrs(
            node['attrs'] is Map ? Map<String, dynamic>.from(node['attrs'] as Map) : null,
          ));
          continue;
        }
        if (type != 'text') continue;

        final text = node['text']?.toString() ?? '';
        if (text.isEmpty) continue;

        final start = buffer.length;
        buffer.write(text);
        final end = buffer.length;

        var bold = false;
        var italic = false;
        var underline = false;
        String? linkHref;
        final nodeMarks = node['marks'];
        if (nodeMarks is List) {
          for (final mark in nodeMarks) {
            if (mark is! Map) continue;
            switch (mark['type']?.toString()) {
              case 'bold':
                bold = true;
              case 'italic':
                italic = true;
              case 'underline':
                underline = true;
              case 'link':
                final attrs = mark['attrs'];
                if (attrs is Map) {
                  linkHref = attrs['href']?.toString();
                }
            }
          }
        }

        if (bold || italic || underline || (linkHref != null && linkHref.isNotEmpty)) {
          marks.add(_MarkRange(
            start: start,
            end: end,
            bold: bold,
            italic: italic,
            underline: underline,
            linkHref: linkHref,
          ));
        }
      }
    }

    var editing = buffer.toString();
    if (marks.isEmpty &&
        gifs.isEmpty &&
        mentions.isEmpty &&
        editing.replaceAll('\n', '').isEmpty) {
      editing = '';
    }

    return ParagraphDoc._(
      editingText: editing,
      marks: marks,
      gifs: gifs,
      mentions: mentions,
    );
  }

  Map<String, dynamic> toPayload() {
    final doc = toTipTapDoc();
    return {
      'text': plainText(),
      'doc': doc,
      'version': 'rich-text',
    };
  }

  Map<String, dynamic> toTipTapDoc() {
    final paragraphContent = <Map<String, dynamic>>[];
    final text = editingText;
    var cursor = 0;
    var gifIndex = 0;
    var mentionIndex = 0;

    while (cursor < text.length) {
      if (text[cursor] == kParagraphGifPlaceholder) {
        if (gifIndex < _gifs.length) {
          final gif = _gifs[gifIndex];
          if (gif.url.trim().isNotEmpty) {
            paragraphContent.add(gif.toInlineGifNode());
          }
        }
        gifIndex++;
        cursor = paragraphGifSlotEnd(text, cursor);
        continue;
      }
      if (text[cursor] == kParagraphMentionPlaceholder) {
        if (mentionIndex < _mentions.length) {
          final mention = _mentions[mentionIndex];
          if (mention.username.trim().isNotEmpty) {
            paragraphContent.add(mention.toMentionNode());
          }
        }
        mentionIndex++;
        cursor = paragraphMentionSlotEnd(text, cursor);
        continue;
      }

      final nextAtom = nextParagraphInlineAtomIndex(text, cursor);
      final end = nextAtom ?? text.length;
      final chunk = text.substring(cursor, end);
      paragraphContent.addAll(_textChunkToNodes(chunk, cursor));
      cursor = end;
    }

    while (gifIndex < _gifs.length) {
      final gif = _gifs[gifIndex];
      if (gif.url.trim().isNotEmpty) {
        paragraphContent.add(gif.toInlineGifNode());
      }
      gifIndex++;
    }
    while (mentionIndex < _mentions.length) {
      final mention = _mentions[mentionIndex];
      if (mention.username.trim().isNotEmpty) {
        paragraphContent.add(mention.toMentionNode());
      }
      mentionIndex++;
    }

    return {
      'type': 'doc',
      'content': [
        {
          'type': 'paragraph',
          'content': paragraphContent,
        },
      ],
    };
  }

  List<Map<String, dynamic>> _textChunkToNodes(String chunk, int offset) {
    if (chunk.isEmpty) return [];

    final boundaries = <int>{0, chunk.length};
    for (final mark in _marks) {
      final localStart = mark.start - offset;
      final localEnd = mark.end - offset;
      if (localEnd <= 0 || localStart >= chunk.length) continue;
      boundaries.add(localStart.clamp(0, chunk.length));
      boundaries.add(localEnd.clamp(0, chunk.length));
    }

    final points = boundaries.toList()..sort();
    final nodes = <Map<String, dynamic>>[];

    for (var i = 0; i < points.length - 1; i++) {
      final a = points[i];
      final b = points[i + 1];
      if (a >= b) continue;
      final segment = chunk.substring(a, b);
      if (segment.isEmpty) continue;

      final absStart = offset + a;
      final absEnd = offset + b;
      final style = _styleAt(absStart, absEnd);
      final marks = <Map<String, dynamic>>[];
      if (style.bold) marks.add({'type': 'bold'});
      if (style.italic) marks.add({'type': 'italic'});
      if (style.underline) marks.add({'type': 'underline'});
      if (style.linkHref != null && style.linkHref!.isNotEmpty) {
        marks.add({
          'type': 'link',
          'attrs': {'href': style.linkHref},
        });
      }

      final node = <String, dynamic>{'type': 'text', 'text': segment};
      if (marks.isNotEmpty) node['marks'] = marks;
      nodes.add(node);
    }

    return nodes;
  }

  ParagraphTextStyle styleForRange(int start, int end) {
    final style = _styleAt(start, end);
    return ParagraphTextStyle(
      bold: style.bold,
      italic: style.italic,
      underline: style.underline,
      linkHref: style.linkHref,
    );
  }

  _MarkRange _styleAt(int start, int end) {
    var bold = false;
    var italic = false;
    var underline = false;
    String? linkHref;

    for (final mark in _marks) {
      if (mark.end <= start || mark.start >= end) continue;
      bold = bold || _safeBool(() => mark.bold);
      italic = italic || _safeBool(() => mark.italic);
      underline = underline || _safeBool(() => mark.underline);
      if (mark.linkHref != null && mark.linkHref!.isNotEmpty) {
        linkHref = mark.linkHref;
      }
    }

    return _MarkRange(
      start: start,
      end: end,
      bold: bold,
      italic: italic,
      underline: underline,
      linkHref: linkHref,
    );
  }

  String plainText() {
    final buffer = StringBuffer();
    var i = 0;
    while (i < editingText.length) {
      if (editingText[i] == kParagraphGifPlaceholder) {
        i = paragraphGifSlotEnd(editingText, i);
        continue;
      }
      if (editingText[i] == kParagraphMentionPlaceholder) {
        i = paragraphMentionSlotEnd(editingText, i);
        continue;
      }
      buffer.write(editingText[i]);
      i++;
    }
    return buffer.toString();
  }

  bool isBoldActive(int start, int end) {
    if (start == end) {
      return _safeBool(() => pendingBold) || _rangeFullyMarked(start, end, bold: true);
    }
    return _rangeFullyMarked(start, end, bold: true);
  }

  bool isItalicActive(int start, int end) {
    if (start == end) {
      return _safeBool(() => pendingItalic) || _rangeFullyMarked(start, end, italic: true);
    }
    return _rangeFullyMarked(start, end, italic: true);
  }

  bool isUnderlineActive(int start, int end) {
    if (start == end) {
      return _safeBool(() => pendingUnderline) ||
          _rangeFullyMarked(start, end, underline: true);
    }
    return _rangeFullyMarked(start, end, underline: true);
  }

  bool isLinkActive(int start, int end) {
    if (start == end) return pendingLinkHref != null;
    return _rangeFullyMarked(start, end, requireLink: true);
  }

  bool _rangeFullyMarked(
    int start,
    int end, {
    bool bold = false,
    bool italic = false,
    bool underline = false,
    bool requireLink = false,
  }) {
    if (start == end) return false;
    for (var i = start; i < end; i++) {
      if (editingText[i] == kParagraphGifPlaceholder) continue;
      if (editingText[i] == kParagraphMentionPlaceholder) continue;
      if (isParagraphGifSlotTailIndex(editingText, i)) continue;
      final style = _styleAt(i, i + 1);
      if (bold && !_safeBool(() => style.bold)) return false;
      if (italic && !_safeBool(() => style.italic)) return false;
      if (underline && !_safeBool(() => style.underline)) return false;
      if (requireLink && (style.linkHref == null || style.linkHref!.isEmpty)) return false;
    }
    return true;
  }

  void toggleBold(int start, int end) {
    if (start == end) {
      pendingBold = !_safeBool(() => pendingBold);
      return;
    }
    final makeBold = !isBoldActive(start, end);
    _applyToggle(start, end, bold: makeBold ? true : null, clearBold: !makeBold);
  }

  void toggleItalic(int start, int end) {
    if (start == end) {
      pendingItalic = !_safeBool(() => pendingItalic);
      return;
    }
    final makeItalic = !isItalicActive(start, end);
    _applyToggle(start, end, italic: makeItalic ? true : null, clearItalic: !makeItalic);
  }

  void toggleUnderline(int start, int end) {
    if (start == end) {
      pendingUnderline = !_safeBool(() => pendingUnderline);
      return;
    }
    final makeUnderline = !isUnderlineActive(start, end);
    _applyToggle(
      start,
      end,
      underline: makeUnderline ? true : null,
      clearUnderline: !makeUnderline,
    );
  }

  void applyLink(int start, int end, String href) {
    if (start == end) {
      pendingLinkHref = href;
      return;
    }
    _applyToggle(start, end, linkHref: href);
  }

  void clearLink(int start, int end) {
    if (start == end) {
      pendingLinkHref = null;
      return;
    }
    _applyToggle(start, end, clearLink: true);
  }

  /// Inserts a link at [index]. Returns the caret index after the inserted link
  /// (including any auto-added spacing).
  int insertLinkLabel(int index, String label, String href) {
    final safeLabel = label.trim().isEmpty ? href : label.trim();

    var prefix = '';
    if (index > 0) {
      final charBefore = editingText[index - 1];
      if (charBefore != ' ' &&
          charBefore != '\n' &&
          charBefore != kParagraphGifPlaceholder) {
        prefix = ' ';
      }
    }

    var suffix = ' ';
    if (index < editingText.length) {
      final charAfter = editingText[index];
      if (charAfter == ' ' || charAfter == '\n') {
        suffix = '';
      }
    }

    final insertText = '$prefix$safeLabel$suffix';
    final before = editingText.substring(0, index);
    final after = editingText.substring(index);
    editingText = '$before$insertText$after';

    final linkStart = index + prefix.length;
    final linkEnd = linkStart + safeLabel.length;
    _shiftMarksAndGifs(index, insertText.length);
    _marks.add(_MarkRange(start: linkStart, end: linkEnd, linkHref: href));
    pendingLinkHref = null;
    _normalizeMarks();
    return index + insertText.length;
  }

  void insertGif(int index, ParagraphGif gif) {
    final before = editingText.substring(0, index);
    final after = editingText.substring(index);
    editingText = '$before$kParagraphGifEditingSlot$after';
    _shiftMarksAndGifs(index, kParagraphGifSlotLength);
    final gifIndex = before.split(kParagraphGifPlaceholder).length - 1;
    _gifs.insert(gifIndex.clamp(0, _gifs.length), gif);
  }

  void syncEditingText(String nextText) {
    final normalized = normalizeParagraphEditingText(nextText);
    final prev = editingText;
    if (prev == normalized) return;

    final prevGifCount = prev.split(kParagraphGifPlaceholder).length - 1;
    final nextGifCount = normalized.split(kParagraphGifPlaceholder).length - 1;
    if (nextGifCount < prevGifCount) {
      _gifs.removeRange(nextGifCount, _gifs.length);
    } else if (nextGifCount > prevGifCount) {
      for (var i = prevGifCount; i < nextGifCount; i++) {
        _gifs.add(const ParagraphGif(url: ''));
      }
    }

    final grew = normalized.length > prev.length;
    editingText = normalized;
    _reconcileMarksAfterTextChange(prev, normalized);
    _clampMarks();
    if (grew) {
      final insertAt = _findFirstDiff(prev, normalized);
      final insertedLen = normalized.length - prev.length;
      final inserted = normalized.substring(insertAt, insertAt + insertedLen);
      if (inserted.contains('\n')) {
        pendingLinkHref = null;
      }
      _applyPendingMarksOnEdit(prev, normalized);
    }
    _splitLinkMarksAtNewlines();
    _normalizeMarks();
  }

  /// Links must not span line breaks — otherwise new lines render inside the link chip.
  void _splitLinkMarksAtNewlines() {
    final updated = <_MarkRange>[];
    for (final mark in _marks) {
      final href = mark.linkHref;
      if (href == null || href.isEmpty) {
        updated.add(mark.copy());
        continue;
      }

      var start = mark.start;
      final end = mark.end;
      while (start < end) {
        final newlineAt = editingText.indexOf('\n', start);
        if (newlineAt == -1 || newlineAt >= end) {
          if (start < end) {
            updated.add(_MarkRange(
              start: start,
              end: end,
              bold: mark.bold,
              italic: mark.italic,
              underline: mark.underline,
              linkHref: href,
            ));
          }
          break;
        }

        if (newlineAt > start) {
          updated.add(_MarkRange(
            start: start,
            end: newlineAt,
            bold: mark.bold,
            italic: mark.italic,
            underline: mark.underline,
            linkHref: href,
          ));
        }
        start = newlineAt + 1;
      }
    }

    _marks
      ..clear()
      ..addAll(updated);
  }

  void _reconcileMarksAfterTextChange(String prev, String next) {
    if (prev == next) return;

    final start = _findFirstDiff(prev, next);
    var endPrev = prev.length;
    var endNext = next.length;
    while (endPrev > start && endNext > start && prev[endPrev - 1] == next[endNext - 1]) {
      endPrev--;
      endNext--;
    }

    final deleteLen = endPrev - start;
    final insertLen = endNext - start;

    if (deleteLen > 0) {
      _applyMarkDeletion(start, endPrev);
    }
    if (insertLen > 0) {
      _applyMarkInsertion(start, insertLen);
    }
    _normalizeMarks();
  }

  void _applyMarkDeletion(int from, int to) {
    final len = to - from;
    if (len <= 0) return;

    final updated = <_MarkRange>[];
    for (final mark in _marks) {
      if (mark.end <= from || mark.start >= to) {
        if (mark.start >= to) {
          updated.add(_MarkRange(
            start: mark.start - len,
            end: mark.end - len,
            bold: mark.bold,
            italic: mark.italic,
            underline: mark.underline,
            linkHref: mark.linkHref,
          ));
        } else {
          updated.add(mark.copy());
        }
        continue;
      }

      if (mark.start < from && mark.end > to) {
        updated.add(_MarkRange(
          start: mark.start,
          end: mark.end - len,
          bold: mark.bold,
          italic: mark.italic,
          underline: mark.underline,
          linkHref: mark.linkHref,
        ));
      } else if (mark.start < from) {
        updated.add(_MarkRange(
          start: mark.start,
          end: from,
          bold: mark.bold,
          italic: mark.italic,
          underline: mark.underline,
          linkHref: mark.linkHref,
        ));
      } else if (mark.end > to) {
        updated.add(_MarkRange(
          start: from,
          end: mark.end - len,
          bold: mark.bold,
          italic: mark.italic,
          underline: mark.underline,
          linkHref: mark.linkHref,
        ));
      }
    }

    _marks
      ..clear()
      ..addAll(updated);
  }

  void _applyMarkInsertion(int insertAt, int len) {
    if (len <= 0) return;
    for (final mark in _marks) {
      if (mark.start >= insertAt) mark.start += len;
      // Only shift the exclusive end when insertion is inside the mark, not after it.
      if (mark.end > insertAt) mark.end += len;
    }
  }

  void _applyPendingMarksOnEdit(String prev, String next) {
    if (prev.length >= next.length) return;
    final insertAt = _findFirstDiff(prev, next);
    final insertedLen = next.length - prev.length;
    if (insertedLen <= 0) return;

    if (!_safeBool(() => pendingBold) &&
        !_safeBool(() => pendingItalic) &&
        !_safeBool(() => pendingUnderline) &&
        pendingLinkHref == null) {
      return;
    }

    final linkHref = pendingLinkHref;
    var offset = insertAt;
    final insertEnd = insertAt + insertedLen;
    while (offset < insertEnd) {
      final nextBreak = next.indexOf('\n', offset);
      final chunkEnd = nextBreak == -1 || nextBreak >= insertEnd ? insertEnd : nextBreak;
      if (chunkEnd > offset) {
        _marks.add(_MarkRange(
          start: offset,
          end: chunkEnd,
          bold: _safeBool(() => pendingBold),
          italic: _safeBool(() => pendingItalic),
          underline: _safeBool(() => pendingUnderline),
          linkHref: linkHref,
        ));
      }
      offset = chunkEnd < insertEnd && nextBreak != -1 ? nextBreak + 1 : insertEnd;
    }
    _normalizeMarks();
  }

  int _findFirstDiff(String a, String b) {
    final max = a.length < b.length ? a.length : b.length;
    for (var i = 0; i < max; i++) {
      if (a[i] != b[i]) return i;
    }
    return max;
  }

  void _applyToggle(
    int start,
    int end, {
    bool? bold,
    bool? italic,
    bool? underline,
    String? linkHref,
    bool clearBold = false,
    bool clearItalic = false,
    bool clearUnderline = false,
    bool clearLink = false,
  }) {
    final s = start < end ? start : end;
    final e = start < end ? end : start;
    if (s == e) return;

    final next = <_MarkRange>[];
    for (final mark in _marks) {
      if (mark.end <= s || mark.start >= e) {
        next.add(mark.copy());
        continue;
      }

      if (mark.start < s) {
        next.add(_MarkRange(
          start: mark.start,
          end: s,
          bold: mark.bold,
          italic: mark.italic,
          underline: mark.underline,
          linkHref: mark.linkHref,
        ));
      }

      final midStart = mark.start < s ? s : mark.start;
      final midEnd = mark.end > e ? e : mark.end;
      next.add(_MarkRange(
        start: midStart,
        end: midEnd,
        bold: clearBold ? false : (bold ?? mark.bold),
        italic: clearItalic ? false : (italic ?? mark.italic),
        underline: clearUnderline ? false : (underline ?? mark.underline),
        linkHref: clearLink ? null : (linkHref ?? mark.linkHref),
      ));

      if (mark.end > e) {
        next.add(_MarkRange(
          start: e,
          end: mark.end,
          bold: mark.bold,
          italic: mark.italic,
          underline: mark.underline,
          linkHref: mark.linkHref,
        ));
      }
    }

    _marks
      ..clear()
      ..addAll(next);
    _normalizeMarks();
  }

  void _shiftMarksAndGifs(int index, int delta) {
    for (final mark in _marks) {
      if (mark.start >= index) mark.start += delta;
      if (mark.end > index) mark.end += delta;
    }
  }

  void _clampMarks() {
    _marks.removeWhere((m) => m.start >= editingText.length || m.end <= m.start);
    for (final mark in _marks) {
      if (mark.end > editingText.length) mark.end = editingText.length;
      if (mark.start < 0) mark.start = 0;
    }
    _normalizeMarks();
  }

  void _normalizeMarks() {
    final cleaned = <_MarkRange>[];
    for (final mark in _marks) {
      if (mark.end <= mark.start) continue;
      if (!mark.bold &&
          !mark.italic &&
          !mark.underline &&
          (mark.linkHref == null || mark.linkHref!.isEmpty)) {
        continue;
      }
      cleaned.add(mark);
    }
    _marks
      ..clear()
      ..addAll(cleaned);
  }

  List<ParagraphGif> get gifs => List.unmodifiable(_gifs);

  List<ParagraphMention> get mentions => List.unmodifiable(_mentions);
}

String paragraphPlainTextFromPayload(Map<String, dynamic> payload) {
  final doc = payload['doc'];
  if (doc is Map<String, dynamic>) {
    return ParagraphDoc.fromTipTapDoc(doc).plainText();
  }
  return payload['text']?.toString().trim() ?? '';
}

String encodeParagraphDocPreview(Map<String, dynamic> payload) => jsonEncode(
      ParagraphDoc.fromPayload(payload).toTipTapDoc(),
    );
