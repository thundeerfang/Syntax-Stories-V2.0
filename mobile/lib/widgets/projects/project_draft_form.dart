import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/project_item.dart';
import '../../models/profile_media_item.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/profile_month_year.dart';
import '../../utils/project_limits.dart';
import '../auth/auth_text_field.dart';
import '../profile/profile_form_fields.dart';
import '../profile/profile_media_items_editor.dart';

class ProjectDraftForm extends StatelessWidget {
  const ProjectDraftForm({
    super.key,
    required this.type,
    required this.titleController,
    required this.publisherController,
    required this.urlController,
    required this.descriptionController,
    required this.ongoing,
    required this.publicationMonth,
    required this.publicationYear,
    required this.endMonth,
    required this.endYear,
    required this.media,
    required this.onTypeChanged,
    required this.onOngoingChanged,
    required this.onPublicationMonth,
    required this.onPublicationYear,
    required this.onEndMonth,
    required this.onEndYear,
    required this.onMediaChanged,
    this.onChanged,
    this.errors = ProjectFormErrors.none,
  });

  final String type;
  final TextEditingController titleController;
  final TextEditingController publisherController;
  final TextEditingController urlController;
  final TextEditingController descriptionController;
  final bool ongoing;
  final String publicationMonth;
  final String publicationYear;
  final String endMonth;
  final String endYear;
  final List<ProfileMediaItem> media;
  final ValueChanged<String> onTypeChanged;
  final ValueChanged<bool> onOngoingChanged;
  final ValueChanged<String?> onPublicationMonth;
  final ValueChanged<String?> onPublicationYear;
  final ValueChanged<String?> onEndMonth;
  final ValueChanged<String?> onEndYear;
  final ValueChanged<List<ProfileMediaItem>> onMediaChanged;
  final VoidCallback? onChanged;
  final ProjectFormErrors errors;

  static const _requiredError = 'Required';

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ProfileFieldLabel(text: 'ENTRY TYPE'),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _TypeToggleButton(
                label: 'PROJECT',
                icon: Icons.folder_copy_outlined,
                selected: type == projectTypeProject,
                onTap: () => onTypeChanged(projectTypeProject),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _TypeToggleButton(
                label: 'PUBLICATION',
                icon: Icons.menu_book_outlined,
                selected: type == projectTypePublication,
                onTap: () => onTypeChanged(projectTypePublication),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        AuthTextField(
          controller: titleController,
          label: 'TITLE',
          required: true,
          maxLength: projectTitleMax,
          externalError: errors.title ? _requiredError : null,
          onChanged: (_) => onChanged?.call(),
        ),
        const SizedBox(height: 14),
        AuthTextField(
          controller: publisherController,
          label: 'PUBLISHER',
          required: true,
          maxLength: projectPublisherMax,
          externalError: errors.publisher ? _requiredError : null,
          onChanged: (_) => onChanged?.call(),
        ),
        const SizedBox(height: 14),
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          value: ongoing,
          onChanged: (v) => onOngoingChanged(v ?? false),
          title: Text(
            'ONGOING PROJECT / PUBLICATION',
            style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800),
          ),
          controlAffinity: ListTileControlAffinity.leading,
        ),
        const SizedBox(height: 8),
        ProfileMonthYearRow(
          label: 'PUBLICATION DATE',
          required: true,
          searchablePickers: true,
          month: publicationMonth,
          year: publicationYear,
          onMonthChanged: onPublicationMonth,
          onYearChanged: onPublicationYear,
          hasError: errors.publicationDate,
          errorText: _requiredError,
        ),
        if (!ongoing) ...[
          const SizedBox(height: 14),
          ProfileMonthYearRow(
            label: 'END DATE (OPTIONAL)',
            searchablePickers: true,
            month: endMonth,
            year: endYear,
            minYear: int.tryParse(publicationYear),
            maxYear: profileCertExpirationEndYear,
            onMonthChanged: onEndMonth,
            onYearChanged: onEndYear,
            hasError: errors.endDateOrder,
            errorText: 'End date cannot be earlier than publication date.',
          ),
        ] else ...[
          const SizedBox(height: 8),
          Text(
            'End date is disabled for ongoing entries.',
            style: GoogleFonts.inter(fontSize: 10, color: colors.mutedForeground),
          ),
        ],
        const SizedBox(height: 14),
        AuthTextField(
          controller: urlController,
          label: 'PUBLICATION URL (OPTIONAL)',
          maxLength: projectUrlMax,
          keyboardType: TextInputType.url,
          autocorrect: false,
          onChanged: (_) => onChanged?.call(),
        ),
        const SizedBox(height: 14),
        AuthTextField(
          controller: descriptionController,
          label: '',
          showFieldLabel: false,
          hintText: 'Describe the project or publication…',
          maxLength: projectDescriptionMax,
          maxLines: 4,
          onChanged: (_) => onChanged?.call(),
        ),
        const SizedBox(height: 16),
        ProfileMediaItemsEditor(
          items: media,
          maxItems: projectMediaMax,
          onChanged: onMediaChanged,
        ),
      ],
    );
  }
}

class _TypeToggleButton extends StatelessWidget {
  const _TypeToggleButton({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Material(
      color: selected ? colors.primary : colors.card,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
          decoration: BoxDecoration(
            border: Border.all(
              color: selected ? colors.primary : colors.border.withValues(alpha: 0.85),
              width: 2,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: selected ? colors.primaryForeground : colors.primary),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  label,
                  style: GoogleFonts.inter(
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.6,
                    color: selected ? colors.primaryForeground : colors.foreground,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

ProjectItem buildProjectItemFromForm({
  required String type,
  required TextEditingController titleController,
  required TextEditingController publisherController,
  required TextEditingController urlController,
  required TextEditingController descriptionController,
  required bool ongoing,
  required String publicationMonth,
  required String publicationYear,
  required String endMonth,
  required String endYear,
  required List<ProfileMediaItem> media,
  ProjectItem? initial,
}) {
  final publicationDate = monthYearToValue(publicationMonth, publicationYear) ?? '';
  final endDate = ongoing ? null : monthYearToValue(endMonth, endYear);

  return ProjectItem(
    type: type == projectTypePublication ? projectTypePublication : projectTypeProject,
    source: initial?.source,
    repoFullName: initial?.repoFullName,
    repoId: initial?.repoId,
    prjLog: initial?.prjLog,
    title: titleController.text.trim(),
    publisher: publisherController.text.trim(),
    ongoing: ongoing,
    publicationDate: publicationDate,
    endDate: endDate,
    publicationUrl: urlController.text.trim().isEmpty ? null : urlController.text.trim(),
    description: descriptionController.text.trim().isEmpty ? null : descriptionController.text.trim(),
    media: media,
  );
}

class ProjectFormErrors {
  const ProjectFormErrors({
    this.title = false,
    this.publisher = false,
    this.publicationDate = false,
    this.endDateOrder = false,
  });

  static const none = ProjectFormErrors();

  final bool title;
  final bool publisher;
  final bool publicationDate;
  final bool endDateOrder;

  bool get hasErrors => title || publisher || publicationDate || endDateOrder;

  static ProjectFormErrors collect({
    required String title,
    required String publisher,
    required String publicationMonth,
    required String publicationYear,
    required bool ongoing,
    required String endMonth,
    required String endYear,
  }) {
    final publication = monthYearToValue(publicationMonth, publicationYear);
    final end = ongoing ? null : monthYearToValue(endMonth, endYear);
    final endDateOrder =
        !ongoing && publication != null && end != null && end.compareTo(publication) < 0;

    return ProjectFormErrors(
      title: title.trim().isEmpty,
      publisher: publisher.trim().isEmpty,
      publicationDate: publication == null,
      endDateOrder: endDateOrder,
    );
  }
}
