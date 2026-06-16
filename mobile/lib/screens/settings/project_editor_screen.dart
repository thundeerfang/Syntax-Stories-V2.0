import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/profile_media_item.dart';
import '../../models/project_item.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/profile_month_year.dart';
import '../../utils/project_limits.dart';
import '../../utils/user_message_case.dart';
import '../../widgets/projects/project_draft_form.dart';
import '../../widgets/settings/settings_section_scaffold.dart';
import '../../widgets/navigation/screen_app_bar.dart';
import '../../widgets/ui/app_feedback_toast.dart';
import '../../widgets/ui/app_pull_to_refresh.dart';

class ProjectEditorScreen extends StatefulWidget {
  const ProjectEditorScreen({
    super.key,
    required this.allItems,
    this.editingIndex,
  });

  final List<ProjectItem> allItems;
  /// Index within [ProjectItem.manualOnly] list, not the full projects array.
  final int? editingIndex;

  List<ProjectItem> get _manualItems => ProjectItem.manualOnly(allItems);

  ProjectItem? get initialItem =>
      editingIndex != null ? _manualItems[editingIndex!] : null;

  static Future<bool?> open(
    BuildContext context, {
    required List<ProjectItem> allItems,
    int? editingIndex,
  }) {
    return Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => ProjectEditorScreen(
          allItems: allItems,
          editingIndex: editingIndex,
        ),
      ),
    );
  }

  bool get _editing => editingIndex != null;

  @override
  State<ProjectEditorScreen> createState() => _ProjectEditorScreenState();
}

class _ProjectEditorScreenState extends State<ProjectEditorScreen> {
  final _title = TextEditingController();
  final _publisher = TextEditingController();
  final _url = TextEditingController();
  final _description = TextEditingController();
  String _type = projectTypeProject;
  bool _ongoing = false;
  String _publicationMonth = '';
  String _publicationYear = '';
  String _endMonth = '';
  String _endYear = '';
  List<ProfileMediaItem> _media = [];
  bool _showValidationErrors = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _hydrateFromInitial();
  }

  void _hydrateFromInitial() {
    final initial = widget.initialItem;
    if (initial == null) return;

    _type = initial.type;
    _title.text = initial.title;
    _publisher.text = initial.publisher ?? '';
    _url.text = initial.publicationUrl ?? '';
    _description.text = initial.description ?? '';
    _ongoing = initial.ongoing;
    _media = List<ProfileMediaItem>.from(initial.media);
    final pub = valueToMonthYear(initial.publicationDate);
    final end = valueToMonthYear(initial.endDate);
    _publicationMonth = pub.month;
    _publicationYear = pub.year;
    _endMonth = end.month;
    _endYear = end.year;
  }

  void _hydrateFromItem(ProjectItem initial) {
    _type = initial.type;
    _title.text = initial.title;
    _publisher.text = initial.publisher ?? '';
    _url.text = initial.publicationUrl ?? '';
    _description.text = initial.description ?? '';
    _ongoing = initial.ongoing;
    _media = List<ProfileMediaItem>.from(initial.media);
    final pub = valueToMonthYear(initial.publicationDate);
    final end = valueToMonthYear(initial.endDate);
    _publicationMonth = pub.month;
    _publicationYear = pub.year;
    _endMonth = end.month;
    _endYear = end.year;
    setState(() => _showValidationErrors = false);
  }

  @override
  void dispose() {
    _title.dispose();
    _publisher.dispose();
    _url.dispose();
    _description.dispose();
    super.dispose();
  }

  ProjectFormErrors get _formErrors {
    if (!_showValidationErrors) return ProjectFormErrors.none;
    return ProjectFormErrors.collect(
      title: _title.text,
      publisher: _publisher.text,
      publicationMonth: _publicationMonth,
      publicationYear: _publicationYear,
      ongoing: _ongoing,
      endMonth: _endMonth,
      endYear: _endYear,
    );
  }

  Future<void> _pullRefresh() async {
    await context.read<AuthState>().refreshUser();
    if (!mounted) return;

    final editIndex = widget.editingIndex;
    if (editIndex == null) return;

    final refreshedManual = ProjectItem.manualOnly(context.read<AuthState>().user?.projects ?? []);
    if (editIndex < refreshedManual.length) {
      _hydrateFromItem(refreshedManual[editIndex]);
    }
  }

  Future<void> _save() async {
    if (_saving) return;

    final errors = ProjectFormErrors.collect(
      title: _title.text,
      publisher: _publisher.text,
      publicationMonth: _publicationMonth,
      publicationYear: _publicationYear,
      ongoing: _ongoing,
      endMonth: _endMonth,
      endYear: _endYear,
    );

    setState(() => _showValidationErrors = true);
    if (errors.hasErrors) return;

    final item = buildProjectItemFromForm(
      type: _type,
      titleController: _title,
      publisherController: _publisher,
      urlController: _url,
      descriptionController: _description,
      ongoing: _ongoing,
      publicationMonth: _publicationMonth,
      publicationYear: _publicationYear,
      endMonth: _endMonth,
      endYear: _endYear,
      media: _media,
      initial: widget.initialItem,
    );

    if (widget.initialItem != null && item == widget.initialItem) {
      if (!mounted) return;
      Navigator.of(context).pop(false);
      return;
    }

    final github = ProjectItem.githubOnly(widget.allItems);
    final manual = List<ProjectItem>.from(widget._manualItems);
    final editIndex = widget.editingIndex;
    if (editIndex != null) {
      manual[editIndex] = item;
    } else {
      manual.add(item);
    }

    final next = ProjectItem.mergeForSave(github: github, manual: manual);

    setState(() => _saving = true);

    final err = await context.read<AuthState>().updateProfileSection('projects', {
      'projects': next.map((e) => e.toJson()).toList(),
    });

    if (!mounted) return;
    setState(() => _saving = false);

    if (err != null) {
      AppFeedbackToast.error(context, formatUserMessage(err));
      return;
    }

    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Scaffold(
      backgroundColor: colors.background,
      appBar: ScreenAppBar(
        title: widget._editing ? 'Edit Project' : 'Add Project',
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: colors.primary,
                foregroundColor: colors.primaryForeground,
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                minimumSize: const Size(0, 36),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
              ),
              child: _saving
                  ? SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: colors.primaryForeground,
                      ),
                    )
                  : Text(
                      'SAVE',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w900, letterSpacing: 0.8),
                    ),
            ),
          ),
        ],
      ),
      body: AppPullToRefresh(
        onRefresh: _pullRefresh,
        child: ListView(
          physics: AppPullToRefresh.scrollPhysics,
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          children: [
            SettingsPlainHeader(
              icon: Icons.folder_copy_outlined,
              title: widget._editing ? 'Update project' : 'Add a project or publication',
              description: 'Title, publisher, publication date, optional URL, description, and media.',
            ),
            const SizedBox(height: 24),
            ProjectDraftForm(
              type: _type,
              titleController: _title,
              publisherController: _publisher,
              urlController: _url,
              descriptionController: _description,
              ongoing: _ongoing,
              publicationMonth: _publicationMonth,
              publicationYear: _publicationYear,
              endMonth: _endMonth,
              endYear: _endYear,
              media: _media,
              errors: _formErrors,
              onTypeChanged: (v) => setState(() => _type = v),
              onOngoingChanged: (v) => setState(() {
                _ongoing = v;
                if (v) {
                  _endMonth = '';
                  _endYear = '';
                }
              }),
              onPublicationMonth: (m) => setState(() => _publicationMonth = m ?? ''),
              onPublicationYear: (y) => setState(() => _publicationYear = y ?? ''),
              onEndMonth: (m) => setState(() => _endMonth = m ?? ''),
              onEndYear: (y) => setState(() => _endYear = y ?? ''),
              onMediaChanged: (next) => setState(() => _media = next),
              onChanged: () => setState(() {}),
            ),
          ],
        ),
      ),
    );
  }
}
