import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/profile_media_item.dart';
import '../../models/work_experience_item.dart';
import '../../models/work_promotion_item.dart';
import '../../services/profile_location_service.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/profile_month_year.dart';
import '../../utils/user_message_case.dart';
import '../../utils/work_experience_limits.dart';
import '../../widgets/settings/settings_section_scaffold.dart';
import '../../widgets/ui/app_pull_to_refresh.dart';
import '../../widgets/work_experience/work_experience_draft_form.dart';

class WorkExperienceEditorScreen extends StatefulWidget {
  const WorkExperienceEditorScreen({
    super.key,
    required this.allItems,
    this.editingIndex,
  });

  final List<WorkExperienceItem> allItems;
  final int? editingIndex;

  WorkExperienceItem? get initialItem =>
      editingIndex != null ? allItems[editingIndex!] : null;

  static Future<bool?> open(
    BuildContext context, {
    required List<WorkExperienceItem> allItems,
    int? editingIndex,
  }) {
    return Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => WorkExperienceEditorScreen(
          allItems: allItems,
          editingIndex: editingIndex,
        ),
      ),
    );
  }

  bool get _editing => editingIndex != null;

  @override
  State<WorkExperienceEditorScreen> createState() => _WorkExperienceEditorScreenState();
}

class _WorkExperienceEditorScreenState extends State<WorkExperienceEditorScreen> {
  final _jobTitle = TextEditingController();
  final _company = TextEditingController();
  final _domain = TextEditingController();
  final _description = TextEditingController();

  String _employmentType = 'Full-time';
  String _locationType = 'On-site';
  String _locationCountry = '';
  String _locationState = '';
  String _locationCity = '';
  String _logoUrl = '';
  String? _logoAlt;
  bool _current = false;
  String _startMonth = '';
  String _startYear = '';
  String _endMonth = '';
  String _endYear = '';
  List<String> _skills = [];
  List<ProfileMediaItem> _media = [];
  List<WorkPromotionItem> _promotions = [];
  bool _showValidationErrors = false;
  bool _saving = false;
  String? _saveError;

  @override
  void initState() {
    super.initState();
    _hydrateFromInitial();
  }

  Future<void> _hydrateFromInitial() async {
    final initial = widget.initialItem;
    if (initial == null) return;

    _jobTitle.text = initial.jobTitle;
    _company.text = initial.company;
    _domain.text = initial.companyDomain ?? '';
    _description.text = initial.description ?? '';
    _logoAlt = initial.companyLogoAlt;
    _employmentType = initial.employmentType;
    _locationType = initial.locationType;
    _logoUrl = initial.companyLogo ?? '';
    _current = initial.currentPosition;
    _skills = List<String>.from(initial.skills);
    _media = List<ProfileMediaItem>.from(initial.media);
    _promotions = List<WorkPromotionItem>.from(initial.promotions);
    final start = valueToMonthYear(initial.startDate);
    final end = valueToMonthYear(initial.endDate);
    _startMonth = start.month;
    _startYear = start.year;
    _endMonth = end.month;
    _endYear = end.year;

    final parsed = await ProfileLocationService.instance.parseLocationString(initial.location);
    if (!mounted) return;
    setState(() {
      _locationCountry = parsed.countryCode;
      _locationState = parsed.stateCode;
      _locationCity = parsed.city;
    });
  }

  Future<void> _hydrateFromItem(WorkExperienceItem initial) async {
    _jobTitle.text = initial.jobTitle;
    _company.text = initial.company;
    _domain.text = initial.companyDomain ?? '';
    _description.text = initial.description ?? '';
    _logoAlt = initial.companyLogoAlt;
    _employmentType = initial.employmentType;
    _locationType = initial.locationType;
    _logoUrl = initial.companyLogo ?? '';
    _current = initial.currentPosition;
    _skills = List<String>.from(initial.skills);
    _media = List<ProfileMediaItem>.from(initial.media);
    _promotions = List<WorkPromotionItem>.from(initial.promotions);
    final start = valueToMonthYear(initial.startDate);
    final end = valueToMonthYear(initial.endDate);
    _startMonth = start.month;
    _startYear = start.year;
    _endMonth = end.month;
    _endYear = end.year;

    final parsed = await ProfileLocationService.instance.parseLocationString(initial.location);
    if (!mounted) return;
    setState(() {
      _locationCountry = parsed.countryCode;
      _locationState = parsed.stateCode;
      _locationCity = parsed.city;
      _showValidationErrors = false;
      _saveError = null;
    });
  }

  @override
  void dispose() {
    _jobTitle.dispose();
    _company.dispose();
    _domain.dispose();
    _description.dispose();
    super.dispose();
  }

  WorkExperienceFormErrors get _formErrors {
    if (!_showValidationErrors) return WorkExperienceFormErrors.none;
    return WorkExperienceFormErrors.collect(
      jobTitle: _jobTitle.text,
      company: _company.text,
      employmentType: _employmentType,
      locationType: _locationType,
      skills: _skills,
      startMonth: _startMonth,
      startYear: _startYear,
      currentPosition: _current,
      endMonth: _endMonth,
      endYear: _endYear,
    );
  }

  void _addPromotion() {
    if (_promotions.length >= workPromotionMax) return;
    setState(() {
      _promotions = [..._promotions, const WorkPromotionItem(jobTitle: '')];
    });
  }

  Future<void> _pullRefresh() async {
    await context.read<AuthState>().refreshUser();
    if (!mounted) return;

    final workId = widget.initialItem?.workId;
    if (workId == null || workId.isEmpty) return;

    final refreshed = context.read<AuthState>().user?.workExperiences;
    WorkExperienceItem? match;
    if (refreshed != null) {
      for (final item in refreshed) {
        if (item.workId == workId) {
          match = item;
          break;
        }
      }
    }
    if (match != null) {
      await _hydrateFromItem(match);
    }
  }

  Future<void> _save() async {
    if (_saving) return;

    final errors = WorkExperienceFormErrors.collect(
      jobTitle: _jobTitle.text,
      company: _company.text,
      employmentType: _employmentType,
      locationType: _locationType,
      skills: _skills,
      startMonth: _startMonth,
      startYear: _startYear,
      currentPosition: _current,
      endMonth: _endMonth,
      endYear: _endYear,
    );

    setState(() {
      _showValidationErrors = true;
      _saveError = null;
    });
    if (errors.hasErrors) return;

    final locationStr = await ProfileLocationService.instance.buildLocationString(
      city: _locationCity,
      stateCode: _locationState,
      countryCode: _locationCountry,
    );
    if (!mounted) return;

    final item = buildWorkExperienceItemFromForm(
      jobTitleController: _jobTitle,
      companyController: _company,
      domainController: _domain,
      descriptionController: _description,
      employmentType: _employmentType,
      locationType: _locationType,
      location: locationStr,
      logoUrl: _logoUrl,
      logoAlt: _logoAlt,
      currentPosition: _current,
      startMonth: _startMonth,
      startYear: _startYear,
      endMonth: _endMonth,
      endYear: _endYear,
      skills: _skills,
      media: _media,
      promotions: _promotions.where((p) => p.jobTitle.trim().isNotEmpty).toList(),
      initial: widget.initialItem,
    );

    if (widget.initialItem != null && item == widget.initialItem) {
      if (!mounted) return;
      Navigator.of(context).pop(false);
      return;
    }

    final next = List<WorkExperienceItem>.from(widget.allItems);
    final editIndex = widget.editingIndex;
    if (editIndex != null) {
      next[editIndex] = item;
    } else {
      next.add(item);
    }

    setState(() => _saving = true);

    final err = await context.read<AuthState>().updateProfileSection('work', {
      'workExperiences': next.take(workExperienceMax).map((e) => e.toJson()).toList(),
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
          (widget._editing ? 'Edit Work Experience' : 'Add Work Experience').toUpperCase(),
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
                      'SAVE CHANGES',
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
              icon: Icons.work_outline_rounded,
              title: widget._editing ? 'Update work experience' : 'Add work experience',
              description:
                  'Job details, company logo, skills, media, and optional promotions for your profile.',
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
            WorkExperienceDraftForm(
              jobTitleController: _jobTitle,
              companyController: _company,
              domainController: _domain,
              descriptionController: _description,
              employmentType: _employmentType,
              locationType: _locationType,
              locationCountry: _locationCountry,
              locationState: _locationState,
              locationCity: _locationCity,
              logoUrl: _logoUrl,
              currentPosition: _current,
              startMonth: _startMonth,
              startYear: _startYear,
              endMonth: _endMonth,
              endYear: _endYear,
              skills: _skills,
              media: _media,
              promotions: _promotions,
              errors: _formErrors,
              onLogoUploaded: (result) => setState(() {
                _logoUrl = result.url;
                _logoAlt = result.imageAlt;
              }),
              onEmploymentType: (v) => setState(() => _employmentType = v ?? _employmentType),
              onLocationType: (v) => setState(() => _locationType = v ?? _locationType),
              onLocationCountryChanged: (v) => setState(() => _locationCountry = v),
              onLocationStateChanged: (v) => setState(() => _locationState = v),
              onLocationCityChanged: (v) => setState(() => _locationCity = v),
              onCurrentChanged: (v) => setState(() => _current = v),
              onStartMonth: (m) => setState(() => _startMonth = m ?? ''),
              onStartYear: (y) => setState(() => _startYear = y ?? ''),
              onEndMonth: (m) => setState(() => _endMonth = m ?? ''),
              onEndYear: (y) => setState(() => _endYear = y ?? ''),
              onSkillsChanged: (v) => setState(() => _skills = v),
              onMediaChanged: (v) => setState(() => _media = v),
              onPromotionsChanged: (v) => setState(() => _promotions = v),
              onAddPromotion: _addPromotion,
              onChanged: () => setState(() {}),
            ),
          ],
        ),
      ),
    );
  }
}
