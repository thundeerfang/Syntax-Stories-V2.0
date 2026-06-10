import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/education_item.dart';
import '../../models/image_upload_kind.dart';
import '../../utils/education_limits.dart';
import '../../utils/profile_month_year.dart';
import '../auth/auth_text_field.dart';
import '../profile/profile_form_fields.dart';
import '../profile/profile_logo_upload_field.dart';
import '../ui/image_upload_crop_dialog.dart';

class EducationDraftForm extends StatelessWidget {
  const EducationDraftForm({
    super.key,
    required this.schoolController,
    required this.domainController,
    required this.degreeController,
    required this.fieldController,
    required this.gradeController,
    required this.descriptionController,
    required this.activityController,
    required this.logoUrl,
    required this.currentEducation,
    required this.startMonth,
    required this.startYear,
    required this.endMonth,
    required this.endYear,
    required this.onLogoUploaded,
    required this.onCurrentChanged,
    required this.onStartMonth,
    required this.onStartYear,
    required this.onEndMonth,
    required this.onEndYear,
    this.onChanged,
    this.errors = EducationFormErrors.none,
  });

  final TextEditingController schoolController;
  final TextEditingController domainController;
  final TextEditingController degreeController;
  final TextEditingController fieldController;
  final TextEditingController gradeController;
  final TextEditingController descriptionController;
  final TextEditingController activityController;
  final String logoUrl;
  final bool currentEducation;
  final String startMonth;
  final String startYear;
  final String endMonth;
  final String endYear;
  final ValueChanged<ImageUploadAssetResult> onLogoUploaded;
  final ValueChanged<bool> onCurrentChanged;
  final ValueChanged<String?> onStartMonth;
  final ValueChanged<String?> onStartYear;
  final ValueChanged<String?> onEndMonth;
  final ValueChanged<String?> onEndYear;
  final VoidCallback? onChanged;
  final EducationFormErrors errors;

  static const _requiredError = 'Required';

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AuthTextField(
          controller: schoolController,
          label: 'SCHOOL',
          required: true,
          maxLength: educationSchoolMax,
          externalError: errors.school ? _requiredError : null,
          onChanged: (_) => onChanged?.call(),
        ),
        const SizedBox(height: 14),
        AuthTextField(
          controller: domainController,
          label: 'SCHOOL DOMAIN (OPTIONAL)',
          hintText: 'stanford.edu',
          maxLength: educationDomainMax,
          keyboardType: TextInputType.url,
          autocorrect: false,
          onChanged: (_) => onChanged?.call(),
        ),
        const SizedBox(height: 16),
        ProfileLogoUploadField(
          label: 'SCHOOL LOGO',
          kind: ImageUploadKind.schoolLogo,
          logoUrl: logoUrl,
          disabled: false,
          onUploaded: onLogoUploaded,
        ),
        const SizedBox(height: 14),
        AuthTextField(
          controller: degreeController,
          label: 'DEGREE',
          required: true,
          maxLength: educationDegreeMax,
          externalError: errors.degree ? _requiredError : null,
          onChanged: (_) => onChanged?.call(),
        ),
        const SizedBox(height: 14),
        AuthTextField(
          controller: fieldController,
          label: 'FIELD OF STUDY (OPTIONAL)',
          maxLength: educationFieldMax,
          onChanged: (_) => onChanged?.call(),
        ),
        const SizedBox(height: 14),
        ProfileMonthYearRow(
          label: 'START DATE',
          required: true,
          searchablePickers: true,
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
          value: currentEducation,
          onChanged: (v) => onCurrentChanged(v ?? false),
          title: Text(
            'CURRENTLY ENROLLED',
            style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800),
          ),
          controlAffinity: ListTileControlAffinity.leading,
        ),
        if (!currentEducation) ...[
          const SizedBox(height: 8),
          ProfileMonthYearRow(
            label: 'END DATE',
            required: true,
            searchablePickers: true,
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
        const SizedBox(height: 14),
        AuthTextField(
          controller: gradeController,
          label: 'GRADE (OPTIONAL)',
          maxLength: educationGradeMax,
          onChanged: (_) => onChanged?.call(),
        ),
        const SizedBox(height: 14),
        AuthTextField(
          controller: descriptionController,
          label: '',
          showFieldLabel: false,
          hintText: 'Describe your program…',
          maxLength: educationDescriptionMax,
          maxLines: 4,
          onChanged: (_) => onChanged?.call(),
        ),
        const SizedBox(height: 14),
        AuthTextField(
          controller: activityController,
          label: '',
          showFieldLabel: false,
          hintText: 'Activities and societies (optional)',
          maxLength: educationActivityMax,
          maxLines: 3,
          onChanged: (_) => onChanged?.call(),
        ),
      ],
    );
  }
}

EducationItem buildEducationItemFromForm({
  required TextEditingController schoolController,
  required TextEditingController domainController,
  required TextEditingController degreeController,
  required TextEditingController fieldController,
  required TextEditingController gradeController,
  required TextEditingController descriptionController,
  required TextEditingController activityController,
  required String logoUrl,
  required String? logoAlt,
  required bool currentEducation,
  required String startMonth,
  required String startYear,
  required String endMonth,
  required String endYear,
  EducationItem? initial,
}) {
  final startDate = monthYearToValue(startMonth, startYear) ?? '';
  final endDate = currentEducation ? null : monthYearToValue(endMonth, endYear);

  return EducationItem(
    eduId: initial?.eduId,
    refCode: initial?.refCode,
    school: schoolController.text.trim(),
    schoolDomain: domainController.text.trim().isEmpty ? null : domainController.text.trim(),
    schoolLogo: logoUrl.trim().isEmpty ? null : logoUrl.trim(),
    schoolLogoAlt: logoAlt?.trim().isEmpty == true ? null : logoAlt?.trim(),
    degree: degreeController.text.trim(),
    fieldOfStudy: fieldController.text.trim().isEmpty ? null : fieldController.text.trim(),
    currentEducation: currentEducation,
    startDate: startDate,
    endDate: endDate,
    grade: gradeController.text.trim().isEmpty ? null : gradeController.text.trim(),
    description: descriptionController.text.trim().isEmpty ? null : descriptionController.text.trim(),
    activity: activityController.text.trim().isEmpty ? null : activityController.text.trim(),
  );
}

class EducationFormErrors {
  const EducationFormErrors({
    this.school = false,
    this.degree = false,
    this.startDate = false,
    this.endDate = false,
    this.endDateOrder = false,
  });

  static const none = EducationFormErrors();

  final bool school;
  final bool degree;
  final bool startDate;
  final bool endDate;
  final bool endDateOrder;

  bool get hasErrors => school || degree || startDate || endDate || endDateOrder;

  static EducationFormErrors collect({
    required String school,
    required String degree,
    required String startMonth,
    required String startYear,
    required bool currentEducation,
    required String endMonth,
    required String endYear,
  }) {
    final start = monthYearToValue(startMonth, startYear);
    final end = currentEducation ? null : monthYearToValue(endMonth, endYear);
    final endDateOrder = !currentEducation &&
        start != null &&
        end != null &&
        end.compareTo(start) < 0;

    return EducationFormErrors(
      school: school.trim().isEmpty,
      degree: degree.trim().isEmpty,
      startDate: start == null,
      endDate: !currentEducation && end == null,
      endDateOrder: endDateOrder,
    );
  }
}

String? validateEducationForm({
  required String school,
  required String degree,
  required String startMonth,
  required String startYear,
  required bool currentEducation,
  required String endMonth,
  required String endYear,
}) {
  final errors = EducationFormErrors.collect(
    school: school,
    degree: degree,
    startMonth: startMonth,
    startYear: startYear,
    currentEducation: currentEducation,
    endMonth: endMonth,
    endYear: endYear,
  );
  if (!errors.hasErrors) return null;
  if (errors.school) return 'School name is required.';
  if (errors.degree) return 'Degree is required.';
  if (errors.startDate) return 'Start date is required.';
  if (errors.endDate) return 'End date is required when not currently enrolled.';
  if (errors.endDateOrder) return 'End date cannot be earlier than start date.';
  return null;
}
