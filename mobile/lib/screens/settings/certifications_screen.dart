import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/app_feedback.dart';
import '../../models/certification_item.dart';
import '../../state/auth_state.dart';
import '../../utils/certification_limits.dart';
import '../../utils/user_message_case.dart';
import '../../widgets/certifications/certification_entry_badge.dart';
import '../../widgets/settings/settings_empty_inventory.dart';
import '../../widgets/settings/settings_inventory_header.dart';
import '../../widgets/settings/settings_section_scaffold.dart';
import '../../widgets/ui/app_confirm_dialog.dart';
import '../../widgets/ui/app_feedback_banner.dart';
import 'certification_editor_screen.dart';

class CertificationsScreen extends StatefulWidget {
  const CertificationsScreen({super.key});

  @override
  State<CertificationsScreen> createState() => _CertificationsScreenState();
}

class _CertificationsScreenState extends State<CertificationsScreen> {
  static const _saveSuccessMessage = 'Certifications saved.';

  String? _feedback;

  Future<void> _openAdd(List<CertificationItem> items) async {
    if (items.length >= certificationMax) {
      setState(() => _feedback = 'You can add up to $certificationMax certifications.');
      return;
    }
    final saved = await CertificationEditorScreen.open(
      context,
      allItems: items,
    );
    if (!mounted) return;
    if (saved == true) {
      setState(() => _feedback = _saveSuccessMessage);
    }
  }

  Future<void> _openEdit(List<CertificationItem> items, int index) async {
    final saved = await CertificationEditorScreen.open(
      context,
      allItems: items,
      editingIndex: index,
    );
    if (!mounted) return;
    if (saved == true) {
      setState(() => _feedback = _saveSuccessMessage);
    }
  }

  Future<void> _confirmRemove(List<CertificationItem> items, int index) async {
    final name = items[index].name;
    final confirmed = await AppConfirmDialog.show(
      context,
      title: 'Remove certification?',
      message: 'Remove $name from your profile?',
      confirmLabel: 'Remove',
    );
    if (confirmed != true || !mounted) return;

    final next = List<CertificationItem>.from(items)..removeAt(index);
    setState(() => _feedback = null);

    final err = await context.read<AuthState>().updateProfileSection('certifications', {
      'certifications': next.map((e) => e.toJson()).toList(),
    });

    if (!mounted) return;
    setState(() {
      _feedback = err == null ? _saveSuccessMessage : formatUserMessage(err);
    });
  }

  Future<void> _pullRefresh() async {
    setState(() => _feedback = null);
    await context.read<AuthState>().refreshUser();
  }

  AppFeedbackKind _feedbackKindFor(String message) {
    if (message == _saveSuccessMessage) return AppFeedbackKind.success;
    return AppFeedbackKind.error;
  }

  @override
  Widget build(BuildContext context) {
    final items =
        (context.watch<AuthState>().user?.certifications ?? []).take(certificationMax).toList();
    final hasItems = items.isNotEmpty;
    final atMax = items.length >= certificationMax;

    return SettingsSectionScaffold(
      title: 'License & Certifications',
      description: 'Add up to $certificationMax licenses\nand certifications with skills and media.',
      icon: Icons.verified_outlined,
      iconOnPrimary: true,
      headerStyle: SettingsSectionHeaderStyle.centeredPlain,
      showHeaderTitle: false,
      onRefresh: _pullRefresh,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AppFeedbackSlot(
            message: _feedback == null ? null : formatUserMessage(_feedback!),
            kind: _feedback == null ? AppFeedbackKind.error : _feedbackKindFor(_feedback!),
          ),
          SettingsInventoryHeader(
            title: 'CERTIFICATION ENTRIES',
            count: items.length,
            max: certificationMax,
            primaryAddButton: true,
            onAdd: hasItems && !atMax ? () => _openAdd(items) : null,
          ),
          const SizedBox(height: 10),
          if (!hasItems)
            SettingsEmptyInventory(
              icon: Icons.verified_outlined,
              message: 'NO CERTIFICATIONS YET.',
              action: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: atMax ? null : () => _openAdd(items),
                  child: Text(
                    'ADD CERTIFICATION',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w900),
                  ),
                ),
              ),
            )
          else
            CertificationEntryBadgeList(
              items: items,
              onRemoveAt: (index) => _confirmRemove(items, index),
              onEditAt: (index) => _openEdit(items, index),
            ),
        ],
      ),
    );
  }
}
