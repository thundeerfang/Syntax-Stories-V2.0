import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/app_feedback.dart';
import '../../models/project_item.dart';
import '../../state/auth_state.dart';
import '../../utils/project_limits.dart';
import '../../utils/user_message_case.dart';
import '../../widgets/projects/project_entry_badge.dart';
import '../../widgets/settings/settings_empty_inventory.dart';
import '../../widgets/settings/settings_inventory_header.dart';
import '../../widgets/settings/settings_section_scaffold.dart';
import '../../widgets/ui/app_confirm_dialog.dart';
import '../../widgets/ui/app_feedback_banner.dart';
import 'project_editor_screen.dart';

class ProjectsScreen extends StatefulWidget {
  const ProjectsScreen({super.key});

  @override
  State<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends State<ProjectsScreen> {
  static const _saveSuccessMessage = 'Projects saved.';

  String? _feedback;

  Future<void> _openAdd(List<ProjectItem> allItems) async {
    if (allItems.length >= projectMax) {
      setState(() => _feedback = 'You can add up to $projectMax projects and publications total.');
      return;
    }
    final saved = await ProjectEditorScreen.open(
      context,
      allItems: allItems,
    );
    if (!mounted) return;
    if (saved == true) {
      setState(() => _feedback = _saveSuccessMessage);
    }
  }

  Future<void> _openEdit(List<ProjectItem> allItems, int manualIndex) async {
    final saved = await ProjectEditorScreen.open(
      context,
      allItems: allItems,
      editingIndex: manualIndex,
    );
    if (!mounted) return;
    if (saved == true) {
      setState(() => _feedback = _saveSuccessMessage);
    }
  }

  Future<void> _confirmRemove(List<ProjectItem> allItems, int manualIndex) async {
    final manualItems = ProjectItem.manualOnly(allItems);
    final title = manualItems[manualIndex].title;
    final confirmed = await AppConfirmDialog.show(
      context,
      title: 'Remove project?',
      message: 'Remove $title from your profile?',
      confirmLabel: 'Remove',
    );
    if (confirmed != true || !mounted) return;

    final nextManual = List<ProjectItem>.from(manualItems)..removeAt(manualIndex);
    final next = ProjectItem.mergeForSave(
      github: ProjectItem.githubOnly(allItems),
      manual: nextManual,
    );
    setState(() => _feedback = null);

    final err = await context.read<AuthState>().updateProfileSection('projects', {
      'projects': next.map((e) => e.toJson()).toList(),
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
    final allItems = (context.watch<AuthState>().user?.projects ?? []).take(projectMax).toList();
    final manualItems = ProjectItem.manualOnly(allItems);
    final githubCount = allItems.length - manualItems.length;
    final hasItems = manualItems.isNotEmpty;
    final atMax = allItems.length >= projectMax;

    return SettingsSectionScaffold(
      title: 'Projects & Publications',
      description:
          'Add up to $projectMax entries.\nGitHub-linked repos ($githubCount) are managed separately.',
      icon: Icons.folder_copy_outlined,
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
            title: 'PROJECT ENTRIES',
            count: manualItems.length,
            max: projectMax,
            primaryAddButton: true,
            onAdd: hasItems && !atMax ? () => _openAdd(allItems) : null,
          ),
          const SizedBox(height: 10),
          if (!hasItems)
            SettingsEmptyInventory(
              icon: Icons.folder_copy_outlined,
              message: 'NO PROJECTS OR PUBLICATIONS YET.',
              action: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: atMax ? null : () => _openAdd(allItems),
                  child: Text(
                    'ADD PROJECT',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w900),
                  ),
                ),
              ),
            )
          else
            ProjectEntryBadgeList(
              items: manualItems,
              onRemoveAt: (index) => _confirmRemove(allItems, index),
              onEditAt: (index) => _openEdit(allItems, index),
            ),
        ],
      ),
    );
  }
}
