import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/app_feedback.dart';
import '../../models/work_experience_item.dart';
import '../../state/auth_state.dart';
import '../../utils/user_message_case.dart';
import '../../utils/work_experience_limits.dart';
import '../../widgets/settings/settings_empty_inventory.dart';
import '../../widgets/settings/settings_inventory_header.dart';
import '../../widgets/settings/settings_section_scaffold.dart';
import '../../widgets/ui/app_confirm_dialog.dart';
import '../../widgets/ui/app_feedback_banner.dart';
import '../../widgets/work_experience/work_experience_entry_badge.dart';
import 'work_experience_editor_screen.dart';

class WorkExperienceScreen extends StatefulWidget {
  const WorkExperienceScreen({super.key});

  @override
  State<WorkExperienceScreen> createState() => _WorkExperienceScreenState();
}

class _WorkExperienceScreenState extends State<WorkExperienceScreen> {
  static const _saveSuccessMessage = 'Work experience saved.';

  String? _feedback;

  Future<void> _openAdd(List<WorkExperienceItem> items) async {
    if (items.length >= workExperienceMax) {
      setState(() => _feedback = 'You can add up to $workExperienceMax work experiences.');
      return;
    }
    final saved = await WorkExperienceEditorScreen.open(
      context,
      allItems: items,
    );
    if (!mounted) return;
    if (saved == true) {
      setState(() => _feedback = _saveSuccessMessage);
    }
  }

  Future<void> _openEdit(List<WorkExperienceItem> items, int index) async {
    final saved = await WorkExperienceEditorScreen.open(
      context,
      allItems: items,
      editingIndex: index,
    );
    if (!mounted) return;
    if (saved == true) {
      setState(() => _feedback = _saveSuccessMessage);
    }
  }

  Future<void> _confirmRemove(List<WorkExperienceItem> items, int index) async {
    final name = items[index].jobTitle;
    final confirmed = await AppConfirmDialog.show(
      context,
      title: 'Remove role?',
      message: 'Remove $name from your profile?',
      confirmLabel: 'Remove',
    );
    if (confirmed != true || !mounted) return;

    final next = List<WorkExperienceItem>.from(items)..removeAt(index);
    setState(() => _feedback = null);

    final err = await context.read<AuthState>().updateProfileSection('work', {
      'workExperiences': next.map((e) => e.toJson()).toList(),
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
    final items = (context.watch<AuthState>().user?.workExperiences ?? [])
        .take(workExperienceMax)
        .toList();
    final hasItems = items.isNotEmpty;
    final atMax = items.length >= workExperienceMax;

    return SettingsSectionScaffold(
      title: 'Work Experiences',
      description: 'Add up to $workExperienceMax roles\nwith logos, skills, and media.',
      icon: Icons.work_outline_rounded,
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
            title: 'WORK ENTRIES',
            count: items.length,
            max: workExperienceMax,
            primaryAddButton: true,
            onAdd: hasItems && !atMax ? () => _openAdd(items) : null,
          ),
          const SizedBox(height: 10),
          if (!hasItems)
            SettingsEmptyInventory(
              icon: Icons.work_outline_rounded,
              message: 'NO WORK EXPERIENCES YET.',
              action: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: atMax ? null : () => _openAdd(items),
                  child: Text('ADD WORK EXPERIENCE', style: GoogleFonts.inter(fontWeight: FontWeight.w900)),
                ),
              ),
            )
          else
            WorkExperienceEntryBadgeList(
              items: items,
              onRemoveAt: (index) => _confirmRemove(items, index),
              onEditAt: (index) => _openEdit(items, index),
            ),
        ],
      ),
    );
  }
}
