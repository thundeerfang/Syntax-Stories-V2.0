import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/education_item.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/education_limits.dart';
import '../../utils/profile_month_year.dart';
import '../../utils/user_message_case.dart';
import '../../widgets/education/education_draft_form.dart';
import '../../widgets/settings/settings_section_scaffold.dart';
import '../../widgets/ui/app_pull_to_refresh.dart';

class EducationEditorScreen extends StatefulWidget {
  const EducationEditorScreen({
    super.key,
    required this.allItems,
    this.editingIndex,
  });

  final List<EducationItem> allItems;
  final int? editingIndex;

  EducationItem? get initialItem =>
      editingIndex != null ? allItems[editingIndex!] : null;

  static Future<bool?> open(
    BuildContext context, {
    required List<EducationItem> allItems,
    int? editingIndex,
  }) {
    return Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => EducationEditorScreen(
          allItems: allItems,
          editingIndex: editingIndex,
        ),
      ),
    );
  }

  bool get _editing => editingIndex != null;

  @override
  State<EducationEditorScreen> createState() => _EducationEditorScreenState();
}

class _EducationEditorScreenState extends State<EducationEditorScreen> {
  final _school = TextEditingController();
  final _domain = TextEditingController();
  final _degree = TextEditingController();
  final _field = TextEditingController();
  final _grade = TextEditingController();
  final _description = TextEditingController();
  final _activity = TextEditingController();
  String _logoUrl = '';
  String? _logoAlt;
  bool _current = false;
  String _startMonth = '';
  String _startYear = '';
  String _endMonth = '';
  String _endYear = '';
  bool _showValidationErrors = false;
  bool _saving = false;
  String? _saveError;

  @override
  void initState() {
    super.initState();
    _hydrateFromInitial();
  }

  void _hydrateFromInitial() {
    final initial = widget.initialItem;
    if (initial == null) return;

    _school.text = initial.school;
    _domain.text = initial.schoolDomain ?? '';
    _degree.text = initial.degree;
    _field.text = initial.fieldOfStudy ?? '';
    _grade.text = initial.grade ?? '';
    _description.text = initial.description ?? '';
    _activity.text = initial.activity ?? '';
    _logoAlt = initial.schoolLogoAlt;
    _logoUrl = initial.schoolLogo ?? '';
    _current = initial.currentEducation;
    final start = valueToMonthYear(initial.startDate);
    final end = valueToMonthYear(initial.endDate);
    _startMonth = start.month;
    _startYear = start.year;
    _endMonth = end.month;
    _endYear = end.year;
  }

  void _hydrateFromItem(EducationItem initial) {
    _school.text = initial.school;
    _domain.text = initial.schoolDomain ?? '';
    _degree.text = initial.degree;
    _field.text = initial.fieldOfStudy ?? '';
    _grade.text = initial.grade ?? '';
    _description.text = initial.description ?? '';
    _activity.text = initial.activity ?? '';
    _logoAlt = initial.schoolLogoAlt;
    _logoUrl = initial.schoolLogo ?? '';
    _current = initial.currentEducation;
    final start = valueToMonthYear(initial.startDate);
    final end = valueToMonthYear(initial.endDate);
    _startMonth = start.month;
    _startYear = start.year;
    _endMonth = end.month;
    _endYear = end.year;
    setState(() {
      _showValidationErrors = false;
      _saveError = null;
    });
  }

  @override
  void dispose() {
    _school.dispose();
    _domain.dispose();
    _degree.dispose();
    _field.dispose();
    _grade.dispose();
    _description.dispose();
    _activity.dispose();
    super.dispose();
  }

  EducationFormErrors get _formErrors {
    if (!_showValidationErrors) return EducationFormErrors.none;
    return EducationFormErrors.collect(
      school: _school.text,
      degree: _degree.text,
      startMonth: _startMonth,
      startYear: _startYear,
      currentEducation: _current,
      endMonth: _endMonth,
      endYear: _endYear,
    );
  }

  Future<void> _pullRefresh() async {
    await context.read<AuthState>().refreshUser();
    if (!mounted) return;

    final eduId = widget.initialItem?.eduId;
    if (eduId == null || eduId.isEmpty) return;

    final refreshed = context.read<AuthState>().user?.education;
    EducationItem? match;
    if (refreshed != null) {
      for (final item in refreshed) {
        if (item.eduId == eduId) {
          match = item;
          break;
        }
      }
    }
    if (match != null) {
      _hydrateFromItem(match);
    }
  }

  Future<void> _save() async {
    if (_saving) return;

    final errors = EducationFormErrors.collect(
      school: _school.text,
      degree: _degree.text,
      startMonth: _startMonth,
      startYear: _startYear,
      currentEducation: _current,
      endMonth: _endMonth,
      endYear: _endYear,
    );

    setState(() {
      _showValidationErrors = true;
      _saveError = null;
    });
    if (errors.hasErrors) return;

    final item = buildEducationItemFromForm(
      schoolController: _school,
      domainController: _domain,
      degreeController: _degree,
      fieldController: _field,
      gradeController: _grade,
      descriptionController: _description,
      activityController: _activity,
      logoUrl: _logoUrl,
      logoAlt: _logoAlt,
      currentEducation: _current,
      startMonth: _startMonth,
      startYear: _startYear,
      endMonth: _endMonth,
      endYear: _endYear,
      initial: widget.initialItem,
    );

    if (widget.initialItem != null && item == widget.initialItem) {
      if (!mounted) return;
      Navigator.of(context).pop(false);
      return;
    }

    final next = List<EducationItem>.from(widget.allItems);
    final editIndex = widget.editingIndex;
    if (editIndex != null) {
      next[editIndex] = item;
    } else {
      next.add(item);
    }

    setState(() => _saving = true);

    final err = await context.read<AuthState>().updateProfileSection('education', {
      'education': next.take(educationMax).map((e) => e.toJson()).toList(),
    });

    if (!mounted) return;
    setState(() => _saving = false);

    if (err != null) {
      setState(() => _saveError = formatUserMessage(err));
      return;
    }

    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Scaffold(
      backgroundColor: colors.background,
      appBar: AppBar(
        backgroundColor: colors.background,
        foregroundColor: colors.foreground,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Text(
          (widget._editing ? 'Edit Education' : 'Add Education').toUpperCase(),
          style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w900, letterSpacing: 1),
        ),
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
              icon: Icons.school_outlined,
              title: widget._editing ? 'Update education' : 'Add a school',
              description: 'School, degree, dates, logo, and optional details for your profile.',
            ),
            if (_saveError != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: colors.destructive.withValues(alpha: 0.08),
                  border: Border.all(color: colors.destructive.withValues(alpha: 0.45), width: 2),
                ),
                child: Text(
                  _saveError!,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: colors.destructive,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 24),
            EducationDraftForm(
              schoolController: _school,
              domainController: _domain,
              degreeController: _degree,
              fieldController: _field,
              gradeController: _grade,
              descriptionController: _description,
              activityController: _activity,
              logoUrl: _logoUrl,
              currentEducation: _current,
              startMonth: _startMonth,
              startYear: _startYear,
              endMonth: _endMonth,
              endYear: _endYear,
              errors: _formErrors,
              onLogoUploaded: (result) => setState(() {
                _logoUrl = result.url;
                _logoAlt = result.imageAlt;
              }),
              onCurrentChanged: (v) => setState(() => _current = v),
              onStartMonth: (m) => setState(() => _startMonth = m ?? ''),
              onStartYear: (y) => setState(() => _startYear = y ?? ''),
              onEndMonth: (m) => setState(() => _endMonth = m ?? ''),
              onEndYear: (y) => setState(() => _endYear = y ?? ''),
              onChanged: () => setState(() {}),
            ),
          ],
        ),
      ),
    );
  }
}
