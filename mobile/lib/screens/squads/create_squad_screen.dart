import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/app_feedback.dart';
import '../../models/image_upload_kind.dart';
import '../../services/api_errors.dart';
import '../../services/auth_api.dart';
import '../../services/squad_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/resolve_profile_media_url.dart';
import '../../utils/squad_category.dart';
import '../../widgets/auth/auth_button.dart';
import '../../widgets/auth/auth_text_field.dart';
import '../../widgets/squads/squad_filter_chips.dart';
import '../../widgets/ui/app_feedback_banner.dart';
import '../../widgets/ui/image_upload_crop_dialog.dart';
import '../../widgets/ui/unfocus_tap_region.dart';

const _nameMax = 100;
const _descMax = 500;

/// Create squad flow — mirrors webapp `CreateSquadDialog` + `POST /api/squads`.
class CreateSquadScreen extends StatefulWidget {
  const CreateSquadScreen({super.key});

  @override
  State<CreateSquadScreen> createState() => _CreateSquadScreenState();
}

class _CreateSquadScreenState extends State<CreateSquadScreen> {
  final _api = SquadApi();
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _description = TextEditingController();

  bool _descOpen = false;
  String? _iconUrl;
  String? _bannerUrl;
  String _visibility = 'public';
  String _category = 'web';
  String _postPolicy = 'all_members';
  String _invitePermission = 'all_members';
  bool _requirePostApproval = false;
  bool _busy = false;
  String? _feedback;
  AppFeedbackKind _feedbackKind = AppFeedbackKind.error;

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  void _setFeedback(String? message, {AppFeedbackKind kind = AppFeedbackKind.error}) {
    setState(() {
      _feedback = message;
      _feedbackKind = kind;
    });
  }

  Future<void> _pickIcon() async {
    final result = await ImageUploadCropDialog.showAssetUpload(
      context,
      ImageUploadKind.squadIcon,
    );
    if (!mounted || result == null) return;
    setState(() => _iconUrl = result.url);
  }

  Future<void> _pickBanner() async {
    final result = await ImageUploadCropDialog.showAssetUpload(
      context,
      ImageUploadKind.squadBanner,
    );
    if (!mounted || result == null) return;
    setState(() => _bannerUrl = result.url);
  }

  Future<void> _submit() async {
    _setFeedback(null);
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      _setFeedback('Sign in to create a squad.');
      return;
    }

    final name = _name.text.trim();
    if (name.isEmpty) {
      _setFeedback('Name is required.');
      return;
    }
    if (_visibility == 'public' && !isSquadCategory(_category)) {
      _setFeedback('Pick a category for public squads.');
      return;
    }

    setState(() => _busy = true);
    try {
      final result = await _api.create(
        bearer: token,
        name: name,
        description: _description.text.trim(),
        iconUrl: _iconUrl,
        coverBannerUrl: _bannerUrl,
        visibility: _visibility,
        category: _visibility == 'public' ? _category : null,
        postPolicy: _postPolicy,
        requirePostApproval: _requirePostApproval,
        invitePermission: _invitePermission,
      );
      if (!mounted) return;

      if (_visibility == 'private' && result.inviteToken != null) {
        await _showInviteTokenDialog(result.inviteToken!);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Squad created')),
        );
      }
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      _setFeedback(e is AuthApiException ? e.message : kGenericUserError);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _showInviteTokenDialog(String token) async {
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          'PRIVATE SQUAD CREATED',
          style: GoogleFonts.inter(fontWeight: FontWeight.w900, fontSize: 14),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Share this invite code so others can join:',
              style: GoogleFonts.inter(fontSize: 14),
            ),
            const SizedBox(height: 12),
            SelectableText(
              token,
              style: GoogleFonts.jetBrainsMono(fontSize: 13, fontWeight: FontWeight.w700),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: token));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Invite code copied')),
              );
            },
            child: const Text('COPY'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('DONE'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final bottomInset = MediaQuery.paddingOf(context).bottom;

    return Scaffold(
      backgroundColor: colors.background,
      appBar: AppBar(
        backgroundColor: colors.background,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: _busy ? null : () => Navigator.pop(context),
        ),
        title: Text(
          'CREATE SQUAD',
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: colors.primary),
        ),
      ),
      body: UnfocusTapRegion(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: EdgeInsets.fromLTRB(16, 16, 16, bottomInset + 24),
            children: [
              if (_feedback != null) ...[
                AppFeedbackBanner(
                  message: _feedback!,
                  kind: _feedbackKind,
                  onDismiss: () => _setFeedback(null),
                ),
                const SizedBox(height: 16),
              ],
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.groups_rounded, size: 20, color: colors.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Create a group where you can learn and interact with other developers around topics that matter to you.',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: colors.mutedForeground,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              _SectionHeader(label: 'Squad details'),
              const SizedBox(height: 12),
              AuthTextField(
                controller: _name,
                label: 'Name your squad',
                hintText: 'e.g. Node.js developers',
                maxLength: _nameMax,
                required: true,
                validator: (v) {
                  final t = v?.trim() ?? '';
                  if (t.isEmpty) return 'Name is required';
                  return null;
                },
              ),
              const SizedBox(height: 8),
              Text(
                'Your squad URL slug is assigned automatically from the name when you create it.',
                style: GoogleFonts.inter(fontSize: 11, color: colors.mutedForeground, height: 1.35),
              ),
              const SizedBox(height: 12),
              if (!_descOpen)
                TextButton(
                  onPressed: () => setState(() => _descOpen = true),
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    alignment: Alignment.centerLeft,
                  ),
                  child: Text(
                    '+ Add description (recommended)',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: colors.primary,
                      decoration: TextDecoration.underline,
                      decorationThickness: 2,
                    ),
                  ),
                )
              else
                AuthTextField(
                  controller: _description,
                  label: 'Description',
                  hintText: 'What is this squad about?',
                  maxLength: _descMax,
                  minLines: 3,
                  maxLines: 5,
                ),
              const SizedBox(height: 24),
              _SectionHeader(label: 'Group icon'),
              const SizedBox(height: 12),
              _MediaPickTile(
                previewUrl: _iconUrl,
                squarePreview: true,
                title: 'Choose logo for the group icon',
                subtitle: 'Square crop · JPEG, PNG, WebP, or GIF · Optional',
                onTap: _busy ? null : _pickIcon,
                onRemove: _iconUrl == null ? null : () => setState(() => _iconUrl = null),
              ),
              const SizedBox(height: 24),
              _SectionHeader(label: 'Squad banner'),
              const SizedBox(height: 8),
              Text(
                'Wide cover behind the squad header. Optional — uses the gradient when empty.',
                style: GoogleFonts.inter(fontSize: 11, color: colors.mutedForeground),
              ),
              const SizedBox(height: 12),
              if (_bannerUrl != null)
                Image.network(
                  resolveProfileMediaUrl(_bannerUrl),
                  height: 96,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => const SizedBox.shrink(),
                )
              else
                Container(
                  height: 96,
                  decoration: BoxDecoration(
                    border: Border.all(color: colors.border, width: 2),
                    color: colors.muted.withValues(alpha: 0.2),
                  ),
                ),
              const SizedBox(height: 8),
              Row(
                children: [
                  OutlinedButton.icon(
                    onPressed: _busy ? null : _pickBanner,
                    icon: const Icon(Icons.image_outlined, size: 18),
                    label: const Text('UPLOAD BANNER'),
                  ),
                  if (_bannerUrl != null) ...[
                    const SizedBox(width: 8),
                    TextButton(
                      onPressed: _busy ? null : () => setState(() => _bannerUrl = null),
                      child: const Text('REMOVE'),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 24),
              _SectionHeader(label: 'Squad type'),
              const SizedBox(height: 12),
              _OptionCard(
                title: 'Public',
                body:
                    'Searchable, listed in the squad directory, and open for everyone to join.',
                selected: _visibility == 'public',
                onTap: _busy ? null : () => setState(() => _visibility = 'public'),
              ),
              const SizedBox(height: 8),
              _OptionCard(
                title: 'Private',
                body: 'Invite-only, hidden from the directory — best for teams and smaller groups.',
                selected: _visibility == 'private',
                onTap: _busy ? null : () => setState(() => _visibility = 'private'),
              ),
              if (_visibility == 'public') ...[
                const SizedBox(height: 16),
                Text(
                  'SQUAD CATEGORY *',
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.2,
                    color: colors.mutedForeground,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Public squads must pick one topic for the directory.',
                  style: GoogleFonts.inter(fontSize: 11, color: colors.mutedForeground),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      for (final id in squadCategoryValues) ...[
                        SquadChip(
                          label: squadCategoryLabel(id),
                          selected: _category == id,
                          onTap: _busy ? () {} : () => setState(() => _category = id),
                        ),
                        const SizedBox(width: 8),
                      ],
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 24),
              Row(
                children: [
                  Icon(Icons.lock_rounded, size: 16, color: colors.primary),
                  const SizedBox(width: 6),
                  _SectionHeader(label: 'Moderation settings'),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'POST CONTENT',
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                  color: colors.mutedForeground,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Choose who may publish new posts or share into this squad.',
                style: GoogleFonts.inter(fontSize: 11, color: colors.mutedForeground),
              ),
              const SizedBox(height: 8),
              _OptionCard(
                title: 'All members',
                body: 'Anyone in the squad can post and share.',
                selected: _postPolicy == 'all_members',
                onTap: _busy ? null : () => setState(() => _postPolicy = 'all_members'),
              ),
              const SizedBox(height: 8),
              _OptionCard(
                title: 'Staff only',
                body: 'Only admins and moderators can post or share.',
                selected: _postPolicy == 'staff_only',
                onTap: _busy ? null : () => setState(() => _postPolicy = 'staff_only'),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  border: Border.all(color: colors.border, width: 2),
                  color: colors.muted.withValues(alpha: 0.1),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Require post approval',
                            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'When on, new posts can be held for moderator review before publishing.',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: colors.mutedForeground,
                              height: 1.35,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Switch.adaptive(
                      value: _requirePostApproval,
                      onChanged: _busy
                          ? null
                          : (v) => setState(() => _requirePostApproval = v),
                      activeTrackColor: colors.primary.withValues(alpha: 0.45),
                      activeThumbColor: colors.primary,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'INVITATION PERMISSIONS',
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                  color: colors.mutedForeground,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Who may add other people to this squad by username.',
                style: GoogleFonts.inter(fontSize: 11, color: colors.mutedForeground),
              ),
              const SizedBox(height: 8),
              _OptionCard(
                title: 'All members',
                body: 'Any member can invite others.',
                selected: _invitePermission == 'all_members',
                onTap: _busy ? null : () => setState(() => _invitePermission = 'all_members'),
              ),
              const SizedBox(height: 8),
              _OptionCard(
                title: 'Staff only',
                body: 'Only admins and moderators can add members.',
                selected: _invitePermission == 'staff_only',
                onTap: _busy ? null : () => setState(() => _invitePermission = 'staff_only'),
              ),
              const SizedBox(height: 28),
              AuthButton(
                label: 'Create squad',
                loadingLabel: 'Creating…',
                loading: _busy,
                onPressed: _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label.toUpperCase(),
      style: GoogleFonts.inter(
        fontSize: 10,
        fontWeight: FontWeight.w900,
        letterSpacing: 1.4,
        color: context.appColors.mutedForeground,
      ),
    );
  }
}

class _OptionCard extends StatelessWidget {
  const _OptionCard({
    required this.title,
    required this.body,
    required this.selected,
    this.onTap,
  });

  final String title;
  final String body;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Material(
      color: selected ? colors.primary.withValues(alpha: 0.1) : colors.card,
      child: InkWell(
        onTap: onTap,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            border: Border.all(
              color: selected ? colors.primary : colors.border,
              width: 2,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: colors.foreground,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                body,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  color: colors.mutedForeground,
                  height: 1.35,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MediaPickTile extends StatelessWidget {
  const _MediaPickTile({
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.previewUrl,
    this.squarePreview = false,
    this.onRemove,
  });

  final String title;
  final String subtitle;
  final VoidCallback? onTap;
  final String? previewUrl;
  final bool squarePreview;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final resolved = resolveProfileMediaUrl(previewUrl);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Material(
          color: colors.muted.withValues(alpha: 0.15),
          child: InkWell(
            onTap: onTap,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border.all(
                  color: previewUrl != null ? colors.border : colors.border,
                  width: 2,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: squarePreview ? 64 : 64,
                    height: 64,
                    decoration: BoxDecoration(
                      border: Border.all(color: colors.border, width: 2),
                      color: colors.background,
                    ),
                    child: resolved.isNotEmpty
                        ? Image.network(resolved, fit: BoxFit.cover, errorBuilder: (_, _, _) {
                            return Icon(Icons.image_outlined, color: colors.mutedForeground);
                          })
                        : Icon(Icons.add_photo_alternate_outlined, color: colors.mutedForeground),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          subtitle,
                          style: GoogleFonts.inter(fontSize: 11, color: colors.mutedForeground),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (onRemove != null)
          TextButton(
            onPressed: onRemove,
            child: Text(
              'REMOVE LOGO',
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: colors.destructive,
              ),
            ),
          ),
      ],
    );
  }
}
