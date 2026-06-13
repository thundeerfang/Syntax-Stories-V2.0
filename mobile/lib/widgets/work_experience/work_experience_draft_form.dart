import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/profile_media_item.dart';
import '../../models/work_experience_item.dart';
import '../../models/work_promotion_item.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/profile_month_year.dart';
import '../../utils/work_experience_limits.dart';
import '../auth/auth_text_field.dart';
import '../profile/profile_form_fields.dart';
import '../profile/profile_location_fields.dart';
import '../profile/profile_logo_upload_field.dart';
import '../profile/profile_media_items_editor.dart';
import '../profile/profile_primary_add_button.dart';
import '../profile/profile_string_chip_input.dart';
import '../ui/image_upload_crop_dialog.dart';
import '../../models/image_upload_kind.dart';

class WorkExperienceDraftForm extends StatelessWidget {
  const WorkExperienceDraftForm({
    super.key,
    required this.jobTitleController,
    required this.companyController,
    required this.domainController,
    required this.descriptionController,
    required this.employmentType,
    required this.locationType,
    required this.locationCountry,
    required this.locationState,
    required this.locationCity,
    required this.logoUrl,
    required this.currentPosition,
    required this.startMonth,
    required this.startYear,
    required this.endMonth,
    required this.endYear,
    required this.skills,
    required this.media,
    required this.promotions,
    required this.onLogoUploaded,
    required this.onEmploymentType,
    required this.onLocationType,
    required this.onLocationCountryChanged,
    required this.onLocationStateChanged,
    required this.onLocationCityChanged,
    required this.onCurrentChanged,
    required this.onStartMonth,
    required this.onStartYear,
    required this.onEndMonth,
    required this.onEndYear,
    required this.onSkillsChanged,
    required this.onMediaChanged,
    required this.onPromotionsChanged,
    required this.onAddPromotion,
    this.onChanged,
    this.errors = WorkExperienceFormErrors.none,
  });

  final TextEditingController jobTitleController;
  final TextEditingController companyController;
  final TextEditingController domainController;
  final TextEditingController descriptionController;
  final String employmentType;
  final String locationType;
  final String locationCountry;
  final String locationState;
  final String locationCity;
  final String logoUrl;
  final bool currentPosition;
  final String startMonth;
  final String startYear;
  final String endMonth;
  final String endYear;
  final List<String> skills;
  final List<ProfileMediaItem> media;
  final List<WorkPromotionItem> promotions;
  final ValueChanged<ImageUploadAssetResult> onLogoUploaded;
  final ValueChanged<String?> onEmploymentType;
  final ValueChanged<String?> onLocationType;
  final ValueChanged<String> onLocationCountryChanged;
  final ValueChanged<String> onLocationStateChanged;
  final ValueChanged<String> onLocationCityChanged;
  final ValueChanged<bool> onCurrentChanged;
  final ValueChanged<String?> onStartMonth;
  final ValueChanged<String?> onStartYear;
  final ValueChanged<String?> onEndMonth;
  final ValueChanged<String?> onEndYear;
  final ValueChanged<List<String>> onSkillsChanged;
  final ValueChanged<List<ProfileMediaItem>> onMediaChanged;
  final ValueChanged<List<WorkPromotionItem>> onPromotionsChanged;
  final VoidCallback onAddPromotion;
  final VoidCallback? onChanged;
  final WorkExperienceFormErrors errors;

  static const _requiredError = 'Required';

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AuthTextField(
          controller: jobTitleController,
          label: 'JOB TITLE',
          required: true,
          maxLength: workJobTitleMax,
          externalError: errors.jobTitle ? _requiredError : null,
          onChanged: (_) => onChanged?.call(),
        ),
        const SizedBox(height: 14),
        ProfileEnumField(
          label: 'EMPLOYMENT TYPE',
          required: true,
          value: employmentType,
          options: employmentTypeValues,
          onChanged: onEmploymentType,
          hasError: errors.employmentType,
          errorText: _requiredError,
        ),
        const SizedBox(height: 14),
        AuthTextField(
          controller: companyController,
          label: 'COMPANY',
          required: true,
          maxLength: workCompanyMax,
          externalError: errors.company ? _requiredError : null,
          onChanged: (_) => onChanged?.call(),
        ),
        const SizedBox(height: 14),
        AuthTextField(
          controller: domainController,
          label: 'COMPANY DOMAIN (OPTIONAL)',
          maxLength: workCompanyDomainMax,
          keyboardType: TextInputType.url,
          autocorrect: false,
          onChanged: (_) => onChanged?.call(),
        ),
        const SizedBox(height: 16),
        ProfileLogoUploadField(
          label: 'COMPANY LOGO',
          kind: ImageUploadKind.companyLogo,
          logoUrl: logoUrl,
          disabled: false,
          onUploaded: onLogoUploaded,
        ),
        const SizedBox(height: 14),
        ProfileEnumField(
          label: 'WORK ARRANGEMENT',
          required: true,
          value: locationType,
          options: locationTypeValues,
          onChanged: onLocationType,
          hasError: errors.locationType,
          errorText: _requiredError,
        ),
        const SizedBox(height: 14),
        ProfileLocationFields(
          countryCode: locationCountry,
          stateCode: locationState,
          city: locationCity,
          onCountryChanged: onLocationCountryChanged,
          onStateChanged: onLocationStateChanged,
          onCityChanged: onLocationCityChanged,
        ),
        const SizedBox(height: 14),
        ProfileMonthYearRow(
          label: 'START DATE',
          required: true,
          month: startMonth,
          year: startYear,
          onMonthChanged: onStartMonth,
          onYearChanged: onStartYear,
          hasError: errors.startDate,
          errorText: _requiredError,
        ),
        const SizedBox(height: 14),
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          value: currentPosition,
          onChanged: (v) => onCurrentChanged(v ?? false),
          title: Text(
            'CURRENT ROLE',
            style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800),
          ),
          controlAffinity: ListTileControlAffinity.leading,
        ),
        if (!currentPosition) ...[
          const SizedBox(height: 8),
          ProfileMonthYearRow(
            label: 'END DATE',
            required: true,
            month: endMonth,
            year: endYear,
            onMonthChanged: onEndMonth,
            onYearChanged: onEndYear,
            hasError: errors.endDate || errors.endDateOrder,
            errorText: errors.endDateOrder
                ? 'End date cannot be earlier than start date.'
                : _requiredError,
          ),
        ],
        const SizedBox(height: 16),
        ProfileStringChipInput(
          label: 'SKILLS',
          required: true,
          values: skills,
          maxValues: workSkillsMax,
          maxLength: workSkillMax,
          onChanged: onSkillsChanged,
          hasError: errors.skills,
          errorText: _requiredError,
        ),
        const SizedBox(height: 16),
        AuthTextField(
          controller: descriptionController,
          label: '',
          showFieldLabel: false,
          hintText: 'Describe your role…',
          maxLength: workDescriptionMax,
          maxLines: 5,
          onChanged: (_) => onChanged?.call(),
        ),
        const SizedBox(height: 16),
        ProfileMediaItemsEditor(
          items: media,
          maxItems: workMediaMax,
          onChanged: onMediaChanged,
        ),
        const SizedBox(height: 20),
        Row(
          children: [
            Expanded(
              child: Text(
                'PROMOTIONS (${promotions.length}/$workPromotionMax)',
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                  color: context.appColors.mutedForeground,
                ),
              ),
            ),
            if (promotions.length < workPromotionMax)
              ProfilePrimaryAddButton(onPressed: onAddPromotion),
          ],
        ),
        const SizedBox(height: 8),
        for (var i = 0; i < promotions.length; i++) ...[
          _PromotionCard(
            index: i,
            item: promotions[i],
            onChanged: (updated) {
              final next = List<WorkPromotionItem>.from(promotions)..[i] = updated;
              onPromotionsChanged(next);
            },
            onRemove: () {
              final next = List<WorkPromotionItem>.from(promotions)..removeAt(i);
              onPromotionsChanged(next);
            },
          ),
          if (i < promotions.length - 1) const SizedBox(height: 10),
        ],
      ],
    );
  }
}

class _PromotionCard extends StatefulWidget {
  const _PromotionCard({
    required this.index,
    required this.item,
    required this.onChanged,
    required this.onRemove,
  });

  final int index;
  final WorkPromotionItem item;
  final ValueChanged<WorkPromotionItem> onChanged;
  final VoidCallback onRemove;

  @override
  State<_PromotionCard> createState() => _PromotionCardState();
}

class _PromotionCardState extends State<_PromotionCard> {
  late final TextEditingController _title;
  late String _startMonth;
  late String _startYear;
  late String _endMonth;
  late String _endYear;
  late bool _current;
  late List<ProfileMediaItem> _media;

  @override
  void initState() {
    super.initState();
    _title = TextEditingController(text: widget.item.jobTitle);
    final start = valueToMonthYear(widget.item.startDate);
    final end = valueToMonthYear(widget.item.endDate);
    _startMonth = start.month;
    _startYear = start.year;
    _endMonth = end.month;
    _endYear = end.year;
    _current = widget.item.currentPosition;
    _media = List<ProfileMediaItem>.from(widget.item.media);
  }

  @override
  void dispose() {
    _title.dispose();
    super.dispose();
  }

  void _emit() {
    widget.onChanged(
      WorkPromotionItem(
        jobTitle: _title.text.trim(),
        startDate: monthYearToValue(_startMonth, _startYear),
        endDate: _current ? null : monthYearToValue(_endMonth, _endYear),
        currentPosition: _current,
        media: _media,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 2),
        color: colors.muted.withValues(alpha: 0.06),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'PROMOTION ${widget.index + 1}',
                  style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900),
                ),
              ),
              IconButton(
                onPressed: widget.onRemove,
                icon: Icon(Icons.delete_outline_rounded, size: 18, color: colors.destructive),
              ),
            ],
          ),
          AuthTextField(
            controller: _title,
            label: 'PROMOTION TITLE',
            maxLength: workJobTitleMax,
            onChanged: (_) => _emit(),
          ),
          const SizedBox(height: 10),
          ProfileMonthYearRow(
            label: 'START',
            month: _startMonth,
            year: _startYear,
            onMonthChanged: (m) {
              setState(() => _startMonth = m ?? '');
              _emit();
            },
            onYearChanged: (y) {
              setState(() => _startYear = y ?? '');
              _emit();
            },
          ),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            value: _current,
            onChanged: (v) {
              setState(() => _current = v ?? false);
              _emit();
            },
            title: Text('CURRENT', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800)),
            controlAffinity: ListTileControlAffinity.leading,
          ),
          if (!_current) ...[
            ProfileMonthYearRow(
              label: 'END',
              month: _endMonth,
              year: _endYear,
              onMonthChanged: (m) {
                setState(() => _endMonth = m ?? '');
                _emit();
              },
              onYearChanged: (y) {
                setState(() => _endYear = y ?? '');
                _emit();
              },
            ),
          ],
          const SizedBox(height: 8),
          ProfileMediaItemsEditor(
            items: _media,
            maxItems: workMediaMax,
            onChanged: (next) {
              setState(() => _media = next);
              _emit();
            },
          ),
        ],
      ),
    );
  }
}

WorkExperienceItem buildWorkExperienceItemFromForm({
  required TextEditingController jobTitleController,
  required TextEditingController companyController,
  required TextEditingController domainController,
  required TextEditingController descriptionController,
  required String employmentType,
  required String locationType,
  required String? location,
  required String logoUrl,
  required String? logoAlt,
  required bool currentPosition,
  required String startMonth,
  required String startYear,
  required String endMonth,
  required String endYear,
  required List<String> skills,
  required List<ProfileMediaItem> media,
  required List<WorkPromotionItem> promotions,
  WorkExperienceItem? initial,
}) {
  final locationValue = location?.trim();
  return WorkExperienceItem(
    workId: initial?.workId,
    jobTitle: jobTitleController.text.trim(),
    employmentType: employmentType.isEmpty ? 'Full-time' : employmentType,
    company: companyController.text.trim(),
    companyDomain: domainController.text.trim().isEmpty ? null : domainController.text.trim(),
    companyLogo: logoUrl.trim().isEmpty ? null : logoUrl.trim(),
    companyLogoAlt: logoAlt?.trim().isEmpty == true ? null : logoAlt?.trim(),
    currentPosition: currentPosition,
    startDate: monthYearToValue(startMonth, startYear) ?? '',
    endDate: currentPosition ? null : monthYearToValue(endMonth, endYear),
    location: locationValue != null && locationValue.isNotEmpty
        ? (locationValue.length > workLocationMax
            ? locationValue.substring(0, workLocationMax)
            : locationValue)
        : null,
    locationType: locationType.isEmpty ? 'On-site' : locationType,
    description: descriptionController.text.trim().isEmpty ? null : descriptionController.text.trim(),
    skills: skills,
    promotions: promotions,
    media: media,
  );
}

class WorkExperienceFormErrors {
  const WorkExperienceFormErrors({
    this.jobTitle = false,
    this.company = false,
    this.employmentType = false,
    this.locationType = false,
    this.skills = false,
    this.startDate = false,
    this.endDate = false,
    this.endDateOrder = false,
  });

  static const none = WorkExperienceFormErrors();

  final bool jobTitle;
  final bool company;
  final bool employmentType;
  final bool locationType;
  final bool skills;
  final bool startDate;
  final bool endDate;
  final bool endDateOrder;

  bool get hasErrors =>
      jobTitle ||
      company ||
      employmentType ||
      locationType ||
      skills ||
      startDate ||
      endDate ||
      endDateOrder;

  static WorkExperienceFormErrors collect({
    required String jobTitle,
    required String company,
    required String employmentType,
    required String locationType,
    required List<String> skills,
    required String startMonth,
    required String startYear,
    required bool currentPosition,
    required String endMonth,
    required String endYear,
  }) {
    final start = monthYearToValue(startMonth, startYear);
    final end = currentPosition ? null : monthYearToValue(endMonth, endYear);
    final endDateOrder = !currentPosition &&
        start != null &&
        end != null &&
        end.compareTo(start) < 0;

    return WorkExperienceFormErrors(
      jobTitle: jobTitle.trim().isEmpty,
      company: company.trim().isEmpty,
      employmentType: employmentType.trim().isEmpty,
      locationType: locationType.trim().isEmpty,
      skills: skills.isEmpty,
      startDate: start == null,
      endDate: !currentPosition && end == null,
      endDateOrder: endDateOrder,
    );
  }
}

String? validateWorkExperienceForm({
  required String jobTitle,
  required String company,
  required String employmentType,
  required String locationType,
  required List<String> skills,
  required String startMonth,
  required String startYear,
  required bool currentPosition,
  required String endMonth,
  required String endYear,
}) {
  final errors = WorkExperienceFormErrors.collect(
    jobTitle: jobTitle,
    company: company,
    employmentType: employmentType,
    locationType: locationType,
    skills: skills,
    startMonth: startMonth,
    startYear: startYear,
    currentPosition: currentPosition,
    endMonth: endMonth,
    endYear: endYear,
  );
  if (!errors.hasErrors) return null;
  if (errors.jobTitle) return 'Job title is required.';
  if (errors.company) return 'Company is required.';
  if (errors.employmentType) return 'Employment type is required.';
  if (errors.locationType) return 'Work arrangement is required.';
  if (errors.skills) return 'Add at least one skill.';
  if (errors.startDate) return 'Start date is required.';
  if (errors.endDate) return 'End date is required when not a current role.';
  if (errors.endDateOrder) return 'End date cannot be earlier than start date.';
  return null;
}
