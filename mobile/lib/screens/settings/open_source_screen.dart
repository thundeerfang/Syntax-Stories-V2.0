import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/project_item.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/github_project_identity.dart';
import '../../utils/open_source_limits.dart';
import '../../utils/user_message_case.dart';
import '../../widgets/open_source/open_source_import_sheet.dart';
import '../../widgets/open_source/open_source_repo_card.dart';
import '../../widgets/settings/settings_empty_inventory.dart';
import '../../widgets/settings/settings_inventory_header.dart';
import '../../widgets/settings/settings_section_scaffold.dart';
import '../../widgets/ui/app_confirm_dialog.dart';
import '../../widgets/ui/app_feedback_toast.dart';
import '../../widgets/ui/github_connect_lottie.dart';
import 'connected_accounts_screen.dart';

class OpenSourceScreen extends StatefulWidget {
  const OpenSourceScreen({super.key});

  @override
  State<OpenSourceScreen> createState() => _OpenSourceScreenState();
}

class _OpenSourceScreenState extends State<OpenSourceScreen> {
  static const _saveSuccessMessage = 'Open source updated.';

  List<ProjectItem> _githubProjects(List<ProjectItem> all) => ProjectItem.githubOnly(all);

  Future<void> _openConnectedAccounts() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => const ConnectedAccountsScreen()),
    );
  }

  Future<void> _openImport(List<ProjectItem> allProjects) async {
    if (_githubProjects(allProjects).length >= openSourceMaxGithubRepos) {
      AppFeedbackToast.error(
        context,
        'You can link up to $openSourceMaxGithubRepos repositories.',
      );
      return;
    }

    await OpenSourceImportSheet.show(
      context,
      existingProjects: allProjects,
      onImported: () {
        if (mounted) AppFeedbackToast.success(context, _saveSuccessMessage);
      },
    );
  }

  Future<void> _handlePrimaryAction(List<ProjectItem> allProjects) async {
    await _openImport(allProjects);
  }

  Future<void> _confirmUnlink(List<ProjectItem> allProjects, int index) async {
    final linked = _githubProjects(allProjects);
    final item = linked[index];
    final repoName = item.repoFullName?.trim().isNotEmpty == true
        ? item.repoFullName!.trim()
        : item.title;
    final confirmed = await AppConfirmDialog.show(
      context,
      title: 'Unlink repository?',
      message: 'Remove $repoName from your profile?',
      confirmLabel: 'Unlink',
    );
    if (confirmed != true || !mounted) return;

    final repoFullName = item.repoFullName ?? repoName;
    final next = removeGithubRepoFromProjects(allProjects, repoFullName);

    final err = await context.read<AuthState>().updateProfileSection('projects', {
      'projects': next.map((e) => e.toJson()).toList(),
    });

    if (!mounted) return;
    if (err == null) {
      AppFeedbackToast.success(context, _saveSuccessMessage);
    } else {
      AppFeedbackToast.error(context, formatUserMessage(err));
    }
  }

  Future<void> _pullRefresh() async {
    await context.read<AuthState>().refreshUser();
  }

  @override
  Widget build(BuildContext context) {
    final allProjects = context.watch<AuthState>().user?.projects ?? [];
    final linked = _githubProjects(allProjects);
    final hasItems = linked.isNotEmpty;
    final atMax = linked.length >= openSourceMaxGithubRepos;
    final gitLinked = context.watch<AuthState>().user?.isGitAccount == true;

    return SettingsSectionScaffold(
      title: 'Open Source',
      description:
          'Live synchronization with GitHub repositories.\nImport up to $openSourceMaxGithubRepos public repos from your account.',
      icon: Icons.code_outlined,
      iconOnPrimary: true,
      headerStyle: SettingsSectionHeaderStyle.centeredPlain,
      showHeaderTitle: false,
      onRefresh: _pullRefresh,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SettingsInventoryHeader(
            title: 'LINKED REPOSITORIES',
            count: linked.length,
            max: openSourceMaxGithubRepos,
            primaryAddButton: true,
            onAdd: gitLinked && !atMax ? () => _handlePrimaryAction(allProjects) : null,
          ),
          const SizedBox(height: 10),
          if (!gitLinked)
            _OpenSourceConnectPrompt(
              onOpenConnectedAccounts: _openConnectedAccounts,
            )
          else if (!hasItems)
            SettingsEmptyInventory(
              icon: Icons.code_outlined,
              message: 'NO REPOSITORIES LINKED YET.',
              action: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: atMax ? null : () => _openImport(allProjects),
                  child: Text(
                    'ADD OPEN SOURCE',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w900),
                  ),
                ),
              ),
            )
          else
            OpenSourceRepoCardList(
              items: linked,
              onRemoveAt: (index) => _confirmUnlink(allProjects, index),
            ),
        ],
      ),
    );
  }
}

class _OpenSourceConnectPrompt extends StatelessWidget {
  const _OpenSourceConnectPrompt({required this.onOpenConnectedAccounts});

  final VoidCallback onOpenConnectedAccounts;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      decoration: BoxDecoration(
        border: Border.all(color: colors.border.withValues(alpha: 0.45), width: 2),
        color: colors.muted.withValues(alpha: 0.08),
      ),
      child: Column(
        children: [
          const GithubConnectLottie(size: 100),
          const SizedBox(height: 12),
          Text(
            'GITHUB IS NOT CONNECTED',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.5,
              color: colors.mutedForeground,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Link GitHub in Connected accounts, then add open source repositories here.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 11,
              height: 1.4,
              color: colors.mutedForeground.withValues(alpha: 0.85),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onOpenConnectedAccounts,
              child: Text(
                'OPEN CONNECTED ACCOUNTS',
                style: GoogleFonts.inter(fontWeight: FontWeight.w900),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
