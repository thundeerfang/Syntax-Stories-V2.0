import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/bookmark_group.dart';
import '../../theme/app_color_tokens.dart';
import '../auth/auth_text_field.dart';
import '../profile/profile_form_fields.dart';
import '../ui/app_form_dialog.dart';

class BookmarkFolderFormValues {
  const BookmarkFolderFormValues({
    this.name = '',
    this.emoji = '',
    this.makeDefault = false,
  });

  final String name;
  final String emoji;
  final bool makeDefault;

  BookmarkFolderFormValues copyWith({
    String? name,
    String? emoji,
    bool? makeDefault,
  }) {
    return BookmarkFolderFormValues(
      name: name ?? this.name,
      emoji: emoji ?? this.emoji,
      makeDefault: makeDefault ?? this.makeDefault,
    );
  }
}

Future<BookmarkFolderFormValues?> showBookmarkFolderFormDialog(
  BuildContext context, {
  required bool isCreate,
  required BookmarkFolderFormValues initial,
}) {
  return AppFormDialog.show<BookmarkFolderFormValues>(
    context,
    builder: (context) => _BookmarkFolderFormDialog(
      isCreate: isCreate,
      initial: initial,
    ),
  );
}

class _BookmarkFolderFormDialog extends StatefulWidget {
  const _BookmarkFolderFormDialog({
    required this.isCreate,
    required this.initial,
  });

  final bool isCreate;
  final BookmarkFolderFormValues initial;

  @override
  State<_BookmarkFolderFormDialog> createState() => _BookmarkFolderFormDialogState();
}

class _BookmarkFolderFormDialogState extends State<_BookmarkFolderFormDialog> {
  late final TextEditingController _name;
  late String _emoji;
  late bool _makeDefault;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.initial.name);
    _emoji = widget.initial.emoji;
    _makeDefault = widget.initial.makeDefault;
    _name.addListener(_onNameChanged);
  }

  @override
  void dispose() {
    _name.removeListener(_onNameChanged);
    _name.dispose();
    super.dispose();
  }

  void _onNameChanged() => setState(() {});

  bool get _canSubmit => _name.text.trim().isNotEmpty;

  void _submit() {
    final name = _name.text.trim();
    if (name.isEmpty) return;
    Navigator.of(context).pop(
      BookmarkFolderFormValues(
        name: name,
        emoji: _emoji,
        makeDefault: _makeDefault,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return AppFormDialog(
      title: widget.isCreate ? 'New folder' : 'Edit folder',
      cancelLabel: 'Cancel',
      confirmLabel: widget.isCreate ? 'Create' : 'Save',
      confirmEnabled: _canSubmit,
      onCancel: () => Navigator.of(context).pop(),
      onConfirm: _submit,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const ProfileFieldLabel(text: 'FOLDER NAME'),
          const SizedBox(height: 8),
          AuthTextField(
            controller: _name,
            label: 'FOLDER NAME',
            showFieldLabel: false,
            hintText: 'e.g. Research',
            maxLength: 80,
            showCounter: false,
            autocorrect: false,
          ),
          const SizedBox(height: 16),
          const ProfileFieldLabel(text: 'EMOJI (OPTIONAL)'),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final emoji in kBookmarkFolderEmojis)
                _EmojiChip(
                  emoji: emoji,
                  selected: _emoji == emoji,
                  onTap: () => setState(() => _emoji = emoji),
                ),
            ],
          ),
          if (widget.isCreate) ...[
            const SizedBox(height: 16),
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: colors.border, width: 2),
              ),
              child: Material(
                color: colors.muted.withValues(alpha: 0.12),
                child: CheckboxListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  value: _makeDefault,
                  onChanged: (value) => setState(() => _makeDefault = value == true),
                  title: Text(
                    'Default folder',
                    style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700),
                  ),
                  subtitle: Text(
                    'New bookmarks from feeds and story pages save here unless you pick another folder.',
                    style: GoogleFonts.inter(fontSize: 12, color: colors.mutedForeground, height: 1.35),
                  ),
                  controlAffinity: ListTileControlAffinity.leading,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _EmojiChip extends StatelessWidget {
  const _EmojiChip({
    required this.emoji,
    required this.selected,
    required this.onTap,
  });

  final String emoji;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Material(
      color: selected ? colors.primary.withValues(alpha: 0.12) : colors.background,
      child: InkWell(
        onTap: onTap,
        child: Container(
          width: 36,
          height: 36,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            border: Border.all(
              color: selected ? colors.primary : colors.border,
              width: 2,
            ),
          ),
          child: Text(emoji, style: const TextStyle(fontSize: 18)),
        ),
      ),
    );
  }
}
