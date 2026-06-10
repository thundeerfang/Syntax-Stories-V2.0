import 'package:flutter/material.dart';

import '../../models/certification_item.dart';
import '../../models/image_upload_kind.dart';
import '../../models/profile_media_item.dart';
import '../../utils/certification_limits.dart';
import '../../utils/profile_month_year.dart';
import '../auth/auth_text_field.dart';
import '../profile/profile_form_fields.dart';
import '../profile/profile_logo_upload_field.dart';
import '../profile/profile_media_items_editor.dart';
import '../profile/profile_string_chip_input.dart';
import '../ui/image_upload_crop_dialog.dart';

class CertificationDraftForm extends StatelessWidget {
  const CertificationDraftForm({
    super.key,
    required this.nameController,
    required this.orgController,
    required this.credentialIdController,
    required this.credentialUrlController,
    required this.descriptionController,
    required this.logoUrl,
    required this.issueMonth,
    required this.issueYear,
    required this.expMonth,
    required this.expYear,
    required this.skills,
    required this.media,
    required this.onLogoUploaded,
    required this.onIssueMonth,
    required this.onIssueYear,
    required this.onExpMonth,
    required this.onExpYear,
    required this.onSkillsChanged,
    required this.onMediaChanged,
    this.onChanged,
    this.errors = CertificationFormErrors.none,
  });

  final TextEditingController nameController;
  final TextEditingController orgController;
  final TextEditingController credentialIdController;
  final TextEditingController credentialUrlController;
  final TextEditingController descriptionController;
  final String logoUrl;
  final String issueMonth;
  final String issueYear;
  final String expMonth;
  final String expYear;
  final List<String> skills;
  final List<ProfileMediaItem> media;
  final ValueChanged<ImageUploadAssetResult> onLogoUploaded;
  final ValueChanged<String?> onIssueMonth;
  final ValueChanged<String?> onIssueYear;
  final ValueChanged<String?> onExpMonth;
  final ValueChanged<String?> onExpYear;
  final ValueChanged<List<String>> onSkillsChanged;
  final ValueChanged<List<ProfileMediaItem>> onMediaChanged;
  final VoidCallback? onChanged;
  final CertificationFormErrors errors;

  static const _requiredError = 'Required';

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AuthTextField(
          controller: nameController,
          label: 'CERTIFICATION NAME',
          required: true,
          maxLength: certificationNameMax,
          externalError: errors.name ? _requiredError : null,
          onChanged: (_) => onChanged?.call(),
        ),
        const SizedBox(height: 14),
        AuthTextField(
          controller: orgController,
          label: 'ISSUING ORGANIZATION',
          required: true,
          maxLength: certificationOrgMax,
          externalError: errors.issuingOrganization ? _requiredError : null,
          onChanged: (_) => onChanged?.call(),
        ),
        const SizedBox(height: 16),
        ProfileLogoUploadField(
          label: 'ISSUER LOGO',
          kind: ImageUploadKind.orgLogo,
          logoUrl: logoUrl,
          disabled: false,
          onUploaded: onLogoUploaded,
        ),
        const SizedBox(height: 14),
        ProfileMonthYearRow(
          label: 'ISSUE DATE',
          required: true,
          searchablePickers: true,
          month: issueMonth,
          year: issueYear,
          onMonthChanged: onIssueMonth,
          onYearChanged: onIssueYear,
          hasError: errors.issueDate,
          errorText: _requiredError,
        ),
        const SizedBox(height: 14),
        ProfileMonthYearRow(
          label: 'EXPIRATION DATE (OPTIONAL)',
          searchablePickers: true,
          month: expMonth,
          year: expYear,
          minYear: int.tryParse(issueYear),
          maxYear: profileCertExpirationEndYear,
          onMonthChanged: onExpMonth,
          onYearChanged: onExpYear,
          hasError: errors.expirationDateOrder,
          errorText: 'Expiration date cannot be earlier than issue date.',
        ),
        const SizedBox(height: 14),
        AuthTextField(
          controller: credentialIdController,
          label: 'CREDENTIAL ID (OPTIONAL)',
          maxLength: certificationCredentialIdMax,
          onChanged: (_) => onChanged?.call(),
        ),
        const SizedBox(height: 14),
        AuthTextField(
          controller: credentialUrlController,
          label: 'CREDENTIAL URL (OPTIONAL)',
          maxLength: certificationCredentialUrlMax,
          keyboardType: TextInputType.url,
          autocorrect: false,
          onChanged: (_) => onChanged?.call(),
        ),
        const SizedBox(height: 16),
        ProfileStringChipInput(
          label: 'SKILLS',
          required: true,
          values: skills,
          maxValues: certificationSkillsMax,
          maxLength: certificationSkillMax,
          onChanged: onSkillsChanged,
          hasError: errors.skills,
          errorText: _requiredError,
        ),
        const SizedBox(height: 16),
        AuthTextField(
          controller: descriptionController,
          label: '',
          showFieldLabel: false,
          hintText: 'Topics, skills validated…',
          maxLength: certificationDescriptionMax,
          maxLines: 4,
          onChanged: (_) => onChanged?.call(),
        ),
        const SizedBox(height: 16),
        ProfileMediaItemsEditor(
          items: media,
          maxItems: certificationMediaMax,
          onChanged: onMediaChanged,
        ),
      ],
    );
  }
}

CertificationItem buildCertificationItemFromForm({
  required TextEditingController nameController,
  required TextEditingController orgController,
  required TextEditingController credentialIdController,
  required TextEditingController credentialUrlController,
  required TextEditingController descriptionController,
  required String logoUrl,
  required String? logoAlt,
  required String issueMonth,
  required String issueYear,
  required String expMonth,
  required String expYear,
  required List<String> skills,
  required List<ProfileMediaItem> media,
  CertificationItem? initial,
}) {
  final issueDate = monthYearToValue(issueMonth, issueYear) ?? '';
  final expirationDate = monthYearToValue(expMonth, expYear);

  return CertificationItem(
    certId: initial?.certId,
    certValType: initial?.certValType,
    currentlyValid: initial?.currentlyValid,
    name: nameController.text.trim(),
    issuingOrganization: orgController.text.trim(),
    issuerLogo: logoUrl.trim().isEmpty ? null : logoUrl.trim(),
    issuerLogoAlt: logoAlt?.trim().isEmpty == true ? null : logoAlt?.trim(),
    issueDate: issueDate,
    expirationDate: expirationDate,
    credentialId: credentialIdController.text.trim().isEmpty
        ? null
        : credentialIdController.text.trim(),
    credentialUrl: credentialUrlController.text.trim().isEmpty
        ? null
        : credentialUrlController.text.trim(),
    description: descriptionController.text.trim().isEmpty ? null : descriptionController.text.trim(),
    skills: skills,
    media: media,
  );
}

class CertificationFormErrors {
  const CertificationFormErrors({
    this.name = false,
    this.issuingOrganization = false,
    this.issueDate = false,
    this.expirationDateOrder = false,
    this.skills = false,
  });

  static const none = CertificationFormErrors();

  final bool name;
  final bool issuingOrganization;
  final bool issueDate;
  final bool expirationDateOrder;
  final bool skills;

  bool get hasErrors =>
      name || issuingOrganization || issueDate || expirationDateOrder || skills;

  static CertificationFormErrors collect({
    required String name,
    required String issuingOrganization,
    required String issueMonth,
    required String issueYear,
    required String expMonth,
    required String expYear,
    required List<String> skills,
  }) {
    final issue = monthYearToValue(issueMonth, issueYear);
    final exp = monthYearToValue(expMonth, expYear);
    final expirationDateOrder =
        issue != null && exp != null && exp.compareTo(issue) < 0;

    return CertificationFormErrors(
      name: name.trim().isEmpty,
      issuingOrganization: issuingOrganization.trim().isEmpty,
      issueDate: issue == null,
      expirationDateOrder: expirationDateOrder,
      skills: skills.where((s) => s.trim().isNotEmpty).isEmpty,
    );
  }
}
