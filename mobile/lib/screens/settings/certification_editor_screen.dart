import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/certification_item.dart';
import '../../models/profile_media_item.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/certification_limits.dart';
import '../../utils/profile_month_year.dart';
import '../../utils/user_message_case.dart';
import '../../widgets/certifications/certification_draft_form.dart';
import '../../widgets/settings/settings_section_scaffold.dart';
import '../../widgets/navigation/screen_app_bar.dart';
import '../../widgets/ui/app_feedback_toast.dart';
import '../../widgets/ui/app_pull_to_refresh.dart';

class CertificationEditorScreen extends StatefulWidget {
  const CertificationEditorScreen({
    super.key,
    required this.allItems,
    this.editingIndex,
  });

  final List<CertificationItem> allItems;
  final int? editingIndex;

  CertificationItem? get initialItem =>
      editingIndex != null ? allItems[editingIndex!] : null;

  static Future<bool?> open(
    BuildContext context, {
    required List<CertificationItem> allItems,
    int? editingIndex,
  }) {
    return Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => CertificationEditorScreen(
          allItems: allItems,
          editingIndex: editingIndex,
        ),
      ),
    );
  }

  bool get _editing => editingIndex != null;

  @override
  State<CertificationEditorScreen> createState() => _CertificationEditorScreenState();
}

class _CertificationEditorScreenState extends State<CertificationEditorScreen> {
  final _name = TextEditingController();
  final _org = TextEditingController();
  final _credentialId = TextEditingController();
  final _credentialUrl = TextEditingController();
  final _description = TextEditingController();
  String _logoUrl = '';
  String? _logoAlt;
  String _issueMonth = '';
  String _issueYear = '';
  String _expMonth = '';
  String _expYear = '';
  List<String> _skills = [];
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

    _name.text = initial.name;
    _org.text = initial.issuingOrganization;
    _credentialId.text = initial.credentialId ?? '';
    _credentialUrl.text = initial.credentialUrl ?? '';
    _description.text = initial.description ?? '';
    _logoAlt = initial.issuerLogoAlt;
    _logoUrl = initial.issuerLogo ?? '';
    _skills = List<String>.from(initial.skills);
    _media = List<ProfileMediaItem>.from(initial.media);
    final issue = valueToMonthYear(initial.issueDate);
    final exp = valueToMonthYear(initial.expirationDate);
    _issueMonth = issue.month;
    _issueYear = issue.year;
    _expMonth = exp.month;
    _expYear = exp.year;
  }

  void _hydrateFromItem(CertificationItem initial) {
    _name.text = initial.name;
    _org.text = initial.issuingOrganization;
    _credentialId.text = initial.credentialId ?? '';
    _credentialUrl.text = initial.credentialUrl ?? '';
    _description.text = initial.description ?? '';
    _logoAlt = initial.issuerLogoAlt;
    _logoUrl = initial.issuerLogo ?? '';
    _skills = List<String>.from(initial.skills);
    _media = List<ProfileMediaItem>.from(initial.media);
    final issue = valueToMonthYear(initial.issueDate);
    final exp = valueToMonthYear(initial.expirationDate);
    _issueMonth = issue.month;
    _issueYear = issue.year;
    _expMonth = exp.month;
    _expYear = exp.year;
    setState(() => _showValidationErrors = false);
  }

  @override
  void dispose() {
    _name.dispose();
    _org.dispose();
    _credentialId.dispose();
    _credentialUrl.dispose();
    _description.dispose();
    super.dispose();
  }

  CertificationFormErrors get _formErrors {
    if (!_showValidationErrors) return CertificationFormErrors.none;
    return CertificationFormErrors.collect(
      name: _name.text,
      issuingOrganization: _org.text,
      issueMonth: _issueMonth,
      issueYear: _issueYear,
      expMonth: _expMonth,
      expYear: _expYear,
      skills: _skills,
    );
  }

  Future<void> _pullRefresh() async {
    await context.read<AuthState>().refreshUser();
    if (!mounted) return;

    final certId = widget.initialItem?.certId;
    if (certId == null || certId.isEmpty) return;

    final refreshed = context.read<AuthState>().user?.certifications;
    CertificationItem? match;
    if (refreshed != null) {
      for (final item in refreshed) {
        if (item.certId == certId) {
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

    final errors = CertificationFormErrors.collect(
      name: _name.text,
      issuingOrganization: _org.text,
      issueMonth: _issueMonth,
      issueYear: _issueYear,
      expMonth: _expMonth,
      expYear: _expYear,
      skills: _skills,
    );

    setState(() => _showValidationErrors = true);
    if (errors.hasErrors) return;

    final item = buildCertificationItemFromForm(
      nameController: _name,
      orgController: _org,
      credentialIdController: _credentialId,
      credentialUrlController: _credentialUrl,
      descriptionController: _description,
      logoUrl: _logoUrl,
      logoAlt: _logoAlt,
      issueMonth: _issueMonth,
      issueYear: _issueYear,
      expMonth: _expMonth,
      expYear: _expYear,
      skills: _skills,
      media: _media,
      initial: widget.initialItem,
    );

    if (widget.initialItem != null && item == widget.initialItem) {
      if (!mounted) return;
      Navigator.of(context).pop(false);
      return;
    }

    final next = List<CertificationItem>.from(widget.allItems);
    final editIndex = widget.editingIndex;
    if (editIndex != null) {
      next[editIndex] = item;
    } else {
      next.add(item);
    }

    setState(() => _saving = true);

    final err = await context.read<AuthState>().updateProfileSection('certifications', {
      'certifications': next.take(certificationMax).map((e) => e.toJson()).toList(),
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
        title: widget._editing ? 'Edit Certification' : 'Add Certification',
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
              icon: Icons.verified_outlined,
              title: widget._editing ? 'Update certification' : 'Add a certification',
              description:
                  'Name, issuing organization, issue date, skills, and optional credential details.',
            ),
            const SizedBox(height: 24),
            CertificationDraftForm(
              nameController: _name,
              orgController: _org,
              credentialIdController: _credentialId,
              credentialUrlController: _credentialUrl,
              descriptionController: _description,
              logoUrl: _logoUrl,
              issueMonth: _issueMonth,
              issueYear: _issueYear,
              expMonth: _expMonth,
              expYear: _expYear,
              skills: _skills,
              media: _media,
              errors: _formErrors,
              onLogoUploaded: (result) => setState(() {
                _logoUrl = result.url;
                _logoAlt = result.imageAlt;
              }),
              onIssueMonth: (m) => setState(() => _issueMonth = m ?? ''),
              onIssueYear: (y) => setState(() => _issueYear = y ?? ''),
              onExpMonth: (m) => setState(() => _expMonth = m ?? ''),
              onExpYear: (y) => setState(() => _expYear = y ?? ''),
              onSkillsChanged: (next) => setState(() => _skills = next),
              onMediaChanged: (next) => setState(() => _media = next),
              onChanged: () => setState(() {}),
            ),
          ],
        ),
      ),
    );
  }
}
