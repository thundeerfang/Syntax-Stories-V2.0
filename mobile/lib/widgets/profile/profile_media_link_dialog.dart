import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/profile_media_item.dart';
import '../../theme/app_color_tokens.dart';
import '../auth/auth_text_field.dart';

/// Reusable dialog for adding a media link with optional title.
class ProfileMediaLinkDialog extends StatefulWidget {
  const ProfileMediaLinkDialog({super.key});

  static Future<ProfileMediaItem?> show(BuildContext context) {
    return showDialog<ProfileMediaItem>(
      context: context,
      barrierDismissible: true,
      builder: (_) => const ProfileMediaLinkDialog(),
    );
  }

  @override
  State<ProfileMediaLinkDialog> createState() => _ProfileMediaLinkDialogState();
}

class _ProfileMediaLinkDialogState extends State<ProfileMediaLinkDialog> {
  final _urlController = TextEditingController();
  final _titleController = TextEditingController();
  String? _urlError;

  @override
  void dispose() {
    _urlController.dispose();
    _titleController.dispose();
    super.dispose();
  }

  void _submit() {
    final url = _urlController.text.trim();
    if (url.isEmpty) {
      setState(() => _urlError = 'Link URL is required.');
      return;
    }
    final title = _titleController.text.trim();
    Navigator.pop(
      context,
      ProfileMediaItem(url: url, title: title.isEmpty ? null : title),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Dialog(
      backgroundColor: colors.card,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 400),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: colors.card,
            border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 2),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'UPLOAD LINK',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 16),
                AuthTextField(
                  controller: _urlController,
                  label: 'LINK URL',
                  showFieldLabel: false,
                  hintText: 'https://…',
                  keyboardType: TextInputType.url,
                  autocorrect: false,
                  showCounter: false,
                  externalError: _urlError,
                  onChanged: (_) {
                    if (_urlError != null) setState(() => _urlError = null);
                  },
                ),
                const SizedBox(height: 12),
                AuthTextField(
                  controller: _titleController,
                  label: 'TITLE',
                  showFieldLabel: false,
                  hintText: 'Title (optional)',
                  maxLength: 120,
                  showCounter: false,
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        child: Text('CANCEL', style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _submit,
                        child: Text('ADD', style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
