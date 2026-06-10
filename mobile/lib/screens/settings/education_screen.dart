import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/app_feedback.dart';
import '../../models/education_item.dart';
import '../../state/auth_state.dart';
import '../../utils/education_limits.dart';
import '../../utils/user_message_case.dart';
import '../../widgets/education/education_entry_badge.dart';
import '../../widgets/settings/settings_empty_inventory.dart';
import '../../widgets/settings/settings_inventory_header.dart';
import '../../widgets/settings/settings_section_scaffold.dart';
import '../../widgets/ui/app_confirm_dialog.dart';
import '../../widgets/ui/app_feedback_banner.dart';
import 'education_editor_screen.dart';

class EducationScreen extends StatefulWidget {
  const EducationScreen({super.key});

  @override
  State<EducationScreen> createState() => _EducationScreenState();
}

class _EducationScreenState extends State<EducationScreen> {
  static const _saveSuccessMessage = 'Education saved.';

  String? _feedback;

  Future<void> _openAdd(List<EducationItem> items) async {
    if (items.length >= educationMax) {
      setState(() => _feedback = 'You can add up to $educationMax education entries.');
      return;
    }
    final saved = await EducationEditorScreen.open(
      context,
      allItems: items,
    );
    if (!mounted) return;
    if (saved == true) {
      setState(() => _feedback = _saveSuccessMessage);
    }
  }

  Future<void> _openEdit(List<EducationItem> items, int index) async {
    final saved = await EducationEditorScreen.open(
      context,
      allItems: items,
      editingIndex: index,
    );
    if (!mounted) return;
    if (saved == true) {
      setState(() => _feedback = _saveSuccessMessage);
    }
  }

  Future<void> _confirmRemove(List<EducationItem> items, int index) async {
    final name = items[index].school;
    final confirmed = await AppConfirmDialog.show(
      context,
      title: 'Remove education?',
      message: 'Remove $name from your profile?',
      confirmLabel: 'Remove',
    );
    if (confirmed != true || !mounted) return;

    final next = List<EducationItem>.from(items)..removeAt(index);
    setState(() => _feedback = null);

    final err = await context.read<AuthState>().updateProfileSection('education', {
      'education': next.map((e) => e.toJson()).toList(),
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
    final items = (context.watch<AuthState>().user?.education ?? []).take(educationMax).toList();
    final hasItems = items.isNotEmpty;
    final atMax = items.length >= educationMax;

    return SettingsSectionScaffold(
      title: 'Education',
      description: 'Add up to $educationMax degrees,\nschools, and study history.',
      icon: Icons.school_outlined,
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
            title: 'EDUCATION ENTRIES',
            count: items.length,
            max: educationMax,
            primaryAddButton: true,
            onAdd: hasItems && !atMax ? () => _openAdd(items) : null,
          ),
          const SizedBox(height: 10),
          if (!hasItems)
            SettingsEmptyInventory(
              icon: Icons.school_outlined,
              message: 'NO EDUCATION ENTRIES YET.',
              action: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: atMax ? null : () => _openAdd(items),
                  child: Text('ADD EDUCATION', style: GoogleFonts.inter(fontWeight: FontWeight.w900)),
                ),
              ),
            )
          else
            EducationEntryBadgeList(
              items: items,
              onRemoveAt: (index) => _confirmRemove(items, index),
              onEditAt: (index) => _openEdit(items, index),
            ),
        ],
      ),
    );
  }
}
