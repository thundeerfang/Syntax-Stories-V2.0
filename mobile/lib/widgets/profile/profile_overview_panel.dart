import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../models/certification_item.dart';
import '../../models/project_item.dart';
import '../../models/setup_item.dart';
import '../../models/user_summary.dart';
import '../stack_tools/stack_tools_display_list.dart';
import '../certifications/certification_entry_badge.dart';
import '../my_setup/setup_component_badge.dart';
import '../open_source/open_source_repo_card.dart';
import '../projects/project_entry_badge.dart';
import 'profile_overview_section_card.dart';

/// Profile overview tab — stack, setup, certs, projects, open source.
class ProfileOverviewPanel extends StatelessWidget {
  const ProfileOverviewPanel({
    super.key,
    required this.user,
  });

  final UserSummary? user;

  @override
  Widget build(BuildContext context) {
    final stack = user?.stackAndTools ?? const [];
    final stackDisplay = user?.stackAndToolsDisplay ?? const [];
    final setup = user?.mySetup ?? const [];
    final certifications = user?.certifications ?? const [];
    final allProjects = user?.projects ?? const [];
    final projects = ProjectItem.manualOnly(allProjects);
    final openSource = ProjectItem.githubOnly(allProjects);

    final sections = <Widget>[
      ProfileOverviewSectionCard(
        title: 'Stack & Tools',
        icon: Icons.memory_outlined,
        isEmpty: stack.isEmpty,
        emptyMessage: 'Add your tech stack',
        child: StackToolsDisplayList(
          names: stack,
          displayItems: stackDisplay,
        ),
      ),
      ProfileOverviewSectionCard(
        title: 'My Setup',
        icon: Icons.build_outlined,
        isEmpty: setup.isEmpty,
        emptyMessage: 'No setup yet',
        child: _SetupList(setup: setup),
      ),
      if (certifications.isNotEmpty)
        ProfileOverviewSectionCard(
          title: 'License & Certifications',
          icon: Icons.verified_outlined,
          child: _CertificationList(certifications: certifications),
        ),
      if (projects.isNotEmpty)
        ProfileOverviewSectionCard(
          title: 'Projects & Publications',
          icon: Icons.folder_copy_outlined,
          child: _ProjectList(projects: projects),
        ),
      if (openSource.isNotEmpty)
        ProfileOverviewSectionCard(
          title: 'Open Source',
          icon: Icons.code_outlined,
          child: _OpenSourceList(
            openSource: openSource,
            onOpen: _openRepo,
          ),
        ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < sections.length; i++) ...[
          if (i > 0) const SizedBox(height: 12),
          sections[i],
        ],
      ],
    );
  }

  Future<void> _openRepo(ProjectItem item) async {
    final url = item.publicationUrl?.trim();
    if (url == null || url.isEmpty) return;
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}

class _SetupList extends StatelessWidget {
  const _SetupList({required this.setup});

  final List<SetupItem> setup;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < setup.length; i++) ...[
          SetupComponentBadge(
            item: setup[i],
            showActions: false,
            onRemove: () {},
          ),
          if (i < setup.length - 1) const SizedBox(height: 10),
        ],
      ],
    );
  }
}

class _CertificationList extends StatelessWidget {
  const _CertificationList({required this.certifications});

  final List<CertificationItem> certifications;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < certifications.length; i++) ...[
          CertificationEntryBadge(
            item: certifications[i],
            showActions: false,
            onRemove: () {},
          ),
          if (i < certifications.length - 1) const SizedBox(height: 10),
        ],
      ],
    );
  }
}

class _ProjectList extends StatelessWidget {
  const _ProjectList({required this.projects});

  final List<ProjectItem> projects;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < projects.length; i++) ...[
          ProjectEntryBadge(
            item: projects[i],
            showActions: false,
            onRemove: () {},
          ),
          if (i < projects.length - 1) const SizedBox(height: 10),
        ],
      ],
    );
  }
}

class _OpenSourceList extends StatelessWidget {
  const _OpenSourceList({
    required this.openSource,
    required this.onOpen,
  });

  final List<ProjectItem> openSource;
  final Future<void> Function(ProjectItem item) onOpen;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < openSource.length; i++) ...[
          OpenSourceRepoCard(
            item: openSource[i],
            showActions: false,
            onRemove: () {},
            onOpen: () => onOpen(openSource[i]),
          ),
          if (i < openSource.length - 1) const SizedBox(height: 10),
        ],
      ],
    );
  }
}
