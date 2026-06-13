import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/setup_item.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/my_setup_limits.dart';
import '../../utils/setup_url.dart';
import '../../utils/user_message_case.dart';
import '../../widgets/my_setup/setup_draft_form.dart';
import '../../widgets/settings/settings_section_scaffold.dart';

/// Full-screen add / edit flow for a single setup component.
class MySetupComponentEditorScreen extends StatefulWidget {
  const MySetupComponentEditorScreen({
    super.key,
    this.initialItem,
  });

  final SetupItem? initialItem;

  static Future<SetupItem?> open(
    BuildContext context, {
    SetupItem? initialItem,
  }) {
    return Navigator.of(context).push<SetupItem>(
      MaterialPageRoute<SetupItem>(
        builder: (_) => MySetupComponentEditorScreen(initialItem: initialItem),
      ),
    );
  }

  bool get _editing => initialItem != null;

  @override
  State<MySetupComponentEditorScreen> createState() => _MySetupComponentEditorScreenState();
}

class _MySetupComponentEditorScreenState extends State<MySetupComponentEditorScreen> {
  final _labelController = TextEditingController();
  final _productUrlController = TextEditingController();
  String _imageUrl = '';
  String? _imageAlt;

  @override
  void initState() {
    super.initState();
    final initial = widget.initialItem;
    if (initial != null) {
      _labelController.text = initial.label;
      _productUrlController.text = initial.productUrl ?? '';
      _imageUrl = initial.imageUrl;
      _imageAlt = initial.imageAlt;
    }
  }

  @override
  void dispose() {
    _labelController.dispose();
    _productUrlController.dispose();
    super.dispose();
  }

  bool get _canSave =>
      _labelController.text.trim().isNotEmpty && _imageUrl.trim().isNotEmpty;

  SetupItem? _buildItem() {
    final label = _labelController.text.trim();
    final imageUrl = _imageUrl.trim();
    if (label.isEmpty || imageUrl.isEmpty) return null;

    final normalizedProduct = normalizeSetupUrl(_productUrlController.text);
    final productUrl = normalizedProduct.isEmpty
        ? null
        : (normalizedProduct.length > setupUrlMax
            ? normalizedProduct.substring(0, setupUrlMax)
            : normalizedProduct);

    return SetupItem(
      label: label.length > setupLabelMax ? label.substring(0, setupLabelMax) : label,
      imageUrl: imageUrl.length > setupUrlMax ? imageUrl.substring(0, setupUrlMax) : imageUrl,
      productUrl: productUrl,
      imageAlt: _imageAlt?.trim().isNotEmpty == true ? _imageAlt!.trim() : null,
    );
  }

  void _save() {
    final item = _buildItem();
    if (item == null) return;

    if (widget.initialItem != null && item == widget.initialItem) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            formatUserMessage('No changes to save.'),
            style: GoogleFonts.inter(fontWeight: FontWeight.w600),
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    Navigator.of(context).pop(item);
  }

  @override
  Widget build(BuildContext context) {
    final editing = widget._editing;

    return Scaffold(
      backgroundColor: context.appColors.background,
      appBar: AppBar(
        backgroundColor: context.appColors.background,
        foregroundColor: context.appColors.foreground,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Text(
          (editing ? 'Edit Component' : 'Add Component').toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w900,
            letterSpacing: 1,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          SettingsPlainHeader(
            icon: Icons.build_outlined,
            title: editing ? 'Update component' : 'Add gear to your setup',
            description: editing
                ? 'Change the label, source link, or component image, then save.'
                : 'Label, optional source link, and a 16∶9 photo for your profile setup grid.',
          ),
          const SizedBox(height: 24),
          SetupDraftForm(
            labelController: _labelController,
            productUrlController: _productUrlController,
            imageUrl: _imageUrl,
            disabled: false,
            onPickImage: (result) => setState(() {
              _imageUrl = result.url;
              _imageAlt = result.imageAlt;
            }),
            onChanged: () => setState(() {}),
          ),
          const SizedBox(height: 28),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _canSave ? _save : null,
              child: Text(
                'SAVE',
                style: GoogleFonts.inter(fontWeight: FontWeight.w900, letterSpacing: 0.8),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
