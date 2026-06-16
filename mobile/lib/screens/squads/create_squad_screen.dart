import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

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
import '../../widgets/squads/squad_create_info_sheet.dart';
import '../../widgets/squads/squad_filter_chips.dart';
import '../../widgets/navigation/main_app_bar.dart';
import '../../widgets/navigation/screen_app_bar.dart';
import '../../widgets/ui/app_feedback_toast.dart';
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

  String? _iconUrl;
  String? _bannerUrl;
  String _visibility = 'public';
  String _category = 'web';
  String _postPolicy = 'all_members';
  String _invitePermission = 'all_members';
  bool _requirePostApproval = false;
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    super.dispose();
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
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      AppFeedbackToast.error(context, 'Sign in to create a squad.');
      return;
    }

    final name = _name.text.trim();
    if (name.isEmpty) {
      AppFeedbackToast.error(context, 'Name is required.');
      return;
    }
    if (_visibility == 'public' && !isSquadCategory(_category)) {
      AppFeedbackToast.error(context, 'Pick a category for public squads.');
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
        AppFeedbackToast.success(context, 'Squad created');
      }
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(
        context,
        e is AuthApiException ? e.message : kGenericUserError,
      );
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
              AppFeedbackToast.success(context, 'Invite code copied');
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
      appBar: ScreenAppBar(
        title: 'Create Squad',
        leading: IconButton(
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(
            minWidth: MainAppBar.iconHitSize,
            minHeight: MainAppBar.iconHitSize,
          ),
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          tooltip: 'Back',
          onPressed: _busy ? null : () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            onPressed: _busy ? null : () => SquadCreateInfoSheet.show(context),
            icon: const Icon(Icons.info_outline_rounded),
            tooltip: 'How squads work',
          ),
        ],
      ),
      body: UnfocusTapRegion(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: EdgeInsets.only(bottom: bottomInset + 24),
            children: [
              _SquadCreateCoverHeader(
                bannerUrl: _bannerUrl,
                iconUrl: _iconUrl,
                enabled: !_busy,
                onPickBanner: _pickBanner,
                onPickIcon: _pickIcon,
                onClearBanner: _bannerUrl == null ? null : () => setState(() => _bannerUrl = null),
                onClearIcon: _iconUrl == null ? null : () => setState(() => _iconUrl = null),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    AuthTextField(
                        controller: _name,
                        label: 'Name Your Squad',
                        hintText: 'e.g. Node.js developers',
                        maxLength: _nameMax,
                        required: true,
                        validator: (v) {
                          final t = v?.trim() ?? '';
                          if (t.isEmpty) return 'Name is required';
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      AuthTextField(
                        controller: _description,
                        label: 'Description',
                        hintText: 'What is this squad about?',
                        maxLength: _descMax,
                        minLines: 3,
                        maxLines: 5,
                        showFieldLabel: false,
                        required: true,
                        validator: (v) {
                          final t = v?.trim() ?? '';
                          if (t.isEmpty) return 'Description is required';
                          if (t.length < 10) return 'Use at least 10 characters';
                          return null;
                        },
                      ),
                      const SizedBox(height: 24),
                      _SectionHeader(label: 'Squad Type'),
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
                _SectionHeader(label: 'Squad Category', required: true),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final id in squadCategoryValues)
                      SquadChip(
                        label: squadCategoryLabel(id),
                        selected: _category == id,
                        onTap: _busy ? () {} : () => setState(() => _category = id),
                      ),
                  ],
                ),
              ],
              const SizedBox(height: 24),
              Row(
                children: [
                  Icon(Icons.lock_rounded, size: 16, color: colors.primary),
                  const SizedBox(width: 6),
                  _SectionHeader(label: 'Moderation Settings'),
                ],
              ),
              const SizedBox(height: 12),
              _OptionCard(
                title: 'All Members',
                body: 'Anyone in the squad can post and share.',
                selected: _postPolicy == 'all_members',
                onTap: _busy ? null : () => setState(() => _postPolicy = 'all_members'),
              ),
              const SizedBox(height: 8),
              _OptionCard(
                title: 'Staff Only',
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
                            'Require Post Approval',
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
              _SectionHeader(label: 'Invitation Permissions'),
              const SizedBox(height: 8),
              _OptionCard(
                title: 'All Members',
                body: 'Any member can invite others.',
                selected: _invitePermission == 'all_members',
                onTap: _busy ? null : () => setState(() => _invitePermission = 'all_members'),
              ),
              const SizedBox(height: 8),
              _OptionCard(
                title: 'Staff Only',
                body: 'Only admins and moderators can add members.',
                selected: _invitePermission == 'staff_only',
                onTap: _busy ? null : () => setState(() => _invitePermission = 'staff_only'),
              ),
              const SizedBox(height: 28),
              AuthButton(
                label: 'Create Squad',
                loadingLabel: 'Creating…',
                loading: _busy,
                onPressed: _submit,
              ),
                    ],
                  ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SquadCreateCoverHeader extends StatelessWidget {
  const _SquadCreateCoverHeader({
    required this.bannerUrl,
    required this.iconUrl,
    required this.enabled,
    required this.onPickBanner,
    required this.onPickIcon,
    this.onClearBanner,
    this.onClearIcon,
  });

  static const bannerHeight = 112.0;
  static const iconSize = 64.0;

  final String? bannerUrl;
  final String? iconUrl;
  final bool enabled;
  final VoidCallback onPickBanner;
  final VoidCallback onPickIcon;
  final VoidCallback? onClearBanner;
  final VoidCallback? onClearIcon;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final resolvedBanner = resolveProfileMediaUrl(bannerUrl);
    final resolvedIcon = resolveProfileMediaUrl(iconUrl);
    final iconTop = bannerHeight - (iconSize / 2);

    return SizedBox(
      height: bannerHeight + (iconSize / 2),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: bannerHeight,
            child: _CoverTapTarget(
              enabled: enabled,
              onTap: onPickBanner,
              onClear: onClearBanner,
              child: resolvedBanner.isNotEmpty
                  ? Image.network(
                      resolvedBanner,
                      fit: BoxFit.cover,
                      width: double.infinity,
                      height: bannerHeight,
                      errorBuilder: (_, _, _) => _BannerPlaceholder(colors: colors),
                    )
                  : _BannerPlaceholder(colors: colors),
            ),
          ),
          Positioned(
            left: 16,
            top: iconTop,
            child: _CoverTapTarget(
              enabled: enabled,
              onTap: onPickIcon,
              onClear: onClearIcon,
              compact: true,
              child: Container(
                width: iconSize,
                height: iconSize,
                decoration: BoxDecoration(
                  color: colors.card,
                  border: Border.all(color: colors.border, width: 3),
                ),
                child: resolvedIcon.isNotEmpty
                    ? Image.network(
                        resolvedIcon,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => Icon(
                          Icons.groups_rounded,
                          color: colors.mutedForeground,
                          size: 28,
                        ),
                      )
                    : Icon(Icons.add_photo_alternate_outlined, color: colors.mutedForeground, size: 28),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BannerPlaceholder extends StatelessWidget {
  const _BannerPlaceholder({required this.colors});

  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            colors.primary.withValues(alpha: 0.35),
            colors.primary.withValues(alpha: 0.12),
          ],
        ),
        border: Border(bottom: BorderSide(color: colors.border, width: 2)),
      ),
      child: Center(
        child: Text(
          'Tap To Add Banner',
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: colors.mutedForeground,
          ),
        ),
      ),
    );
  }
}

class _CoverTapTarget extends StatelessWidget {
  const _CoverTapTarget({
    required this.child,
    required this.onTap,
    required this.enabled,
    this.onClear,
    this.compact = false,
  });

  final Widget child;
  final VoidCallback onTap;
  final bool enabled;
  final VoidCallback? onClear;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: enabled ? onTap : null,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            child,
            if (onClear != null && enabled)
              Positioned(
                top: compact ? -6 : 8,
                right: compact ? -6 : 8,
                child: Material(
                  color: colors.background,
                  child: InkWell(
                    onTap: onClear,
                    child: Container(
                      width: compact ? 24 : 28,
                      height: compact ? 24 : 28,
                      decoration: BoxDecoration(
                        border: Border.all(color: colors.border, width: 1.5),
                      ),
                      child: Icon(
                        Icons.close_rounded,
                        size: compact ? 14 : 16,
                        color: colors.foreground,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.label, this.required = false});

  final String label;
  final bool required;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final style = GoogleFonts.inter(
      fontSize: 12,
      fontWeight: FontWeight.w700,
      color: colors.mutedForeground,
    );
    if (!required) {
      return Text(label, style: style);
    }
    return Text.rich(
      TextSpan(
        children: [
          TextSpan(text: label, style: style),
          TextSpan(text: ' *', style: style.copyWith(color: colors.destructive)),
        ],
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
