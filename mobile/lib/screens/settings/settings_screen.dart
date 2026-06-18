import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/user_summary.dart';
import '../../services/account_prefetch.dart';
import '../../services/invite_api.dart';
import '../../settings/settings_nav.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/auth_navigation.dart';
import '../../utils/field_validation_rules.dart';
import '../../widgets/auth/auth_text_field.dart';
import '../../models/profile_image_upload_kind.dart';
import '../../widgets/profile/edit_profile_hero.dart';
import '../../widgets/profile/edit_profile_portfolio_card.dart';
import '../../widgets/profile/edit_profile_social_card.dart';
import '../../widgets/profile/profile_image_upload_dialog.dart';
import '../../widgets/ui/app_confirm_dialog.dart';
import '../../widgets/ui/app_feedback_toast.dart';
import '../../widgets/ui/unfocus_tap_region.dart';
import '../../widgets/navigation/screen_app_bar.dart';
import '../../widgets/ui/app_pull_to_refresh.dart';
import 'refer_earn_screen.dart';
import 'settings_section_screen.dart';
import 'stack_tools_screen.dart';
import 'my_setup_screen.dart';
import 'connected_accounts_screen.dart';
import 'certifications_screen.dart';
import 'open_source_screen.dart';
import 'blog_streak_screen.dart';
import 'update_email_screen.dart';
import 'notifications_screen.dart';
import 'projects_screen.dart';
import 'syntax_card_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _openGroups = <SettingsGroup, bool>{
    SettingsGroup.account: true,
    SettingsGroup.security: true,
    SettingsGroup.other: true,
  };
  final _searchController = TextEditingController();

  String _search = '';
  InviteMe? _inviteMe;
  bool _inviteLoading = true;
  bool _linkCopied = false;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() => setState(() => _search = _searchController.text));
    _inviteMe = AccountPrefetch.inviteMe;
    _inviteLoading = _inviteMe == null;
    if (_inviteMe == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _loadInvite());
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _refreshSettings() async {
    await context.read<AuthState>().refreshUser();
    await _loadInvite();
  }

  Future<void> _loadInvite() async {
    if (!mounted) return;
    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      setState(() => _inviteLoading = false);
      return;
    }

    final showSpinner = _inviteMe == null;
    if (showSpinner) setState(() => _inviteLoading = true);

    try {
      await AccountPrefetch.prefetch(token);
      if (!mounted) return;
      setState(() => _inviteMe = AccountPrefetch.inviteMe);
    } catch (_) {
      if (mounted && _inviteMe == null) setState(() => _inviteMe = null);
    } finally {
      if (mounted) setState(() => _inviteLoading = false);
    }
  }

  Future<void> _copyInviteLink() async {
    final url = _inviteMe?.inviteUrl;
    if (url == null || url.isEmpty) return;
    await Clipboard.setData(ClipboardData(text: url));
    if (!mounted) return;
    setState(() => _linkCopied = true);
    AppFeedbackToast.success(context, 'Invite link copied');
    Future<void>.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _linkCopied = false);
    });
  }

  void _openReferEarn() {
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => const ReferEarnScreen()),
    );
  }

  List<SettingsNavItem> _filteredItemsFor(SettingsGroup group) {
    final q = _search.trim().toLowerCase();
    final items = settingsItemsForGroup(group);
    if (q.isEmpty) return items;
    return items.where((item) {
      return item.label.toLowerCase().contains(q) || item.description.toLowerCase().contains(q);
    }).toList();
  }

  bool get _hasVisibleGroups {
    for (final group in SettingsGroup.values) {
      if (_filteredItemsFor(group).isNotEmpty) return true;
    }
    return false;
  }

  void _openSection(SettingsNavItem item) {
    if (item.id == 'edit-profile') {
      Navigator.of(context).push<void>(
        MaterialPageRoute<void>(builder: (_) => const SettingsEditProfileScreen()),
      );
      return;
    }
    if (item.id == 'stack-tools') {
      Navigator.of(context).push<void>(
        MaterialPageRoute<void>(builder: (_) => const StackToolsScreen()),
      );
      return;
    }
    if (item.id == 'my-setup') {
      Navigator.of(context).push<void>(
        MaterialPageRoute<void>(builder: (_) => const MySetupScreen()),
      );
      return;
    }
    if (item.id == 'connected-accounts') {
      Navigator.of(context).push<void>(
        MaterialPageRoute<void>(builder: (_) => const ConnectedAccountsScreen()),
      );
      return;
    }
    if (item.id == 'certifications') {
      Navigator.of(context).push<void>(
        MaterialPageRoute<void>(builder: (_) => const CertificationsScreen()),
      );
      return;
    }
    if (item.id == 'projects') {
      Navigator.of(context).push<void>(
        MaterialPageRoute<void>(builder: (_) => const ProjectsScreen()),
      );
      return;
    }
    if (item.id == 'open-source') {
      Navigator.of(context).push<void>(
        MaterialPageRoute<void>(builder: (_) => const OpenSourceScreen()),
      );
      return;
    }
    if (item.id == 'blog-streak') {
      Navigator.of(context).push<void>(
        MaterialPageRoute<void>(builder: (_) => const BlogStreakScreen()),
      );
      return;
    }
    if (item.id == 'security-email') {
      Navigator.of(context).push<void>(
        MaterialPageRoute<void>(builder: (_) => const UpdateEmailScreen()),
      );
      return;
    }
    if (item.id == 'syntax-card') {
      Navigator.of(context).push<void>(
        MaterialPageRoute<void>(builder: (_) => const SyntaxCardScreen()),
      );
      return;
    }
    if (item.id == 'notifications') {
      Navigator.of(context).push<void>(
        MaterialPageRoute<void>(builder: (_) => const NotificationsScreen()),
      );
      return;
    }
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => SettingsSectionScreen(item: item)),
    );
  }

  Future<void> _confirmLogout() async {
    final confirmed = await AppConfirmDialog.show(
      context,
      title: 'Log out?',
      message: 'You will need to sign in again to access your account.',
      confirmLabel: 'Log out',
      cancelLabel: 'Cancel',
      variant: AppConfirmDialogVariant.logout,
    );
    if (confirmed != true || !mounted) return;
    await context.read<AuthState>().logout();
    if (!mounted) return;
    popToAppRoot(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.appColors.background,
      appBar: const ScreenAppBar(title: 'Settings'),
      body: AppPullToRefresh(
        onRefresh: _refreshSettings,
        child: ListView(
          physics: AppPullToRefresh.scrollPhysics,
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          children: [
          _ReferEarnHighlightCard(
            inviteUrl: _inviteMe?.inviteUrl ?? '',
            loading: _inviteLoading,
            copied: _linkCopied,
            onCopy: _copyInviteLink,
            onOpenReferEarn: _openReferEarn,
          ),
          const SizedBox(height: 16),
          _SettingsSearchField(controller: _searchController),
          const SizedBox(height: 16),
          if (!_hasVisibleGroups && _search.trim().isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Text(
                'No settings match "${_search.trim()}".',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: context.appColors.mutedForeground),
              ),
            ),
          for (final group in SettingsGroup.values) ...[
            if (_filteredItemsFor(group).isNotEmpty)
              _SettingsGroup(
                group: group,
                items: _filteredItemsFor(group),
                open: _openGroups[group] ?? true,
                onToggle: () => setState(() => _openGroups[group] = !(_openGroups[group] ?? true)),
                onItemTap: _openSection,
              ),
            if (_filteredItemsFor(group).isNotEmpty) const SizedBox(height: 12),
          ],
          _LogoutButton(onTap: _confirmLogout),
        ],
        ),
      ),
    );
  }
}

class _ReferEarnHighlightCard extends StatelessWidget {
  const _ReferEarnHighlightCard({
    required this.inviteUrl,
    required this.loading,
    required this.copied,
    required this.onCopy,
    required this.onOpenReferEarn,
  });

  final String inviteUrl;
  final bool loading;
  final bool copied;
  final VoidCallback onCopy;
  final VoidCallback onOpenReferEarn;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.appColors.card,
        border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
        boxShadow: [
          BoxShadow(color: context.appColors.shadow, offset: Offset(2, 2), blurRadius: 0),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: context.appColors.primary,
                  border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
                ),
                child: const Icon(Icons.card_giftcard_rounded, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'INVITE · REFER & EARN',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.8,
                        color: context.appColors.foreground,
                      ),
                    ),
                    Text(
                      'Share your link and earn when friends join.',
                      style: GoogleFonts.inter(fontSize: 12, color: context.appColors.mutedForeground),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            'REFERRAL LINK',
            style: GoogleFonts.inter(
              fontSize: 9,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.2,
              color: context.appColors.mutedForeground,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  decoration: BoxDecoration(
                    color: context.appColors.card.withValues(alpha: 0.92),
                    border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
                  ),
                  child: loading
                      ? const _ReferralLinkSkeleton()
                      : Text(
                          inviteUrl.isNotEmpty ? inviteUrl : 'Invite link unavailable',
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            height: 1.35,
                            color: context.appColors.foreground,
                          ),
                        ),
                ),
              ),
              const SizedBox(width: 8),
              Material(
                color: loading || inviteUrl.isEmpty ? context.appColors.muted : context.appColors.primary,
                child: InkWell(
                  onTap: loading || inviteUrl.isEmpty ? null : onCopy,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    decoration: BoxDecoration(
                      border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
                    ),
                    child: Icon(
                      copied ? Icons.check_rounded : Icons.copy_rounded,
                      size: 18,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: onOpenReferEarn,
            style: ElevatedButton.styleFrom(
              backgroundColor: context.appColors.foreground,
              foregroundColor: context.appColors.background,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
              elevation: 0,
            ),
            child: Text(
              'OPEN REFER & EARN',
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 1,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReferralLinkSkeleton extends StatefulWidget {
  const _ReferralLinkSkeleton();

  @override
  State<_ReferralLinkSkeleton> createState() => _ReferralLinkSkeletonState();
}

class _ReferralLinkSkeletonState extends State<_ReferralLinkSkeleton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _pulse,
      builder: (context, child) {
        final alpha = 0.28 + (_pulse.value * 0.22);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _SkeletonBar(opacity: alpha, widthFactor: 1),
            const SizedBox(height: 8),
            _SkeletonBar(opacity: alpha, widthFactor: 0.68),
          ],
        );
      },
    );
  }
}

class _SkeletonBar extends StatelessWidget {
  const _SkeletonBar({required this.opacity, required this.widthFactor});

  final double opacity;
  final double widthFactor;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: FractionallySizedBox(
        widthFactor: widthFactor,
        child: Container(
          height: 10,
          color: context.appColors.muted.withValues(alpha: opacity),
        ),
      ),
    );
  }
}

class _SettingsSearchField extends StatelessWidget {
  const _SettingsSearchField({required this.controller});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    return UnfocusTapRegion(
      child: TextField(
        controller: controller,
        textInputAction: TextInputAction.search,
        style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
        decoration: InputDecoration(
          hintText: 'Search settings…',
          hintStyle: GoogleFonts.inter(color: context.appColors.mutedForeground),
          prefixIcon: Icon(Icons.search_rounded, color: context.appColors.mutedForeground, size: 22),
          suffixIcon: controller.text.isNotEmpty
              ? IconButton(
                  icon: Icon(Icons.close_rounded, size: 20, color: context.appColors.mutedForeground),
                  onPressed: controller.clear,
                )
              : null,
          filled: true,
          fillColor: context.appColors.inputFill,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          enabledBorder: OutlineInputBorder(
            borderSide: BorderSide(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
            borderRadius: BorderRadius.zero,
          ),
          focusedBorder: OutlineInputBorder(
            borderSide: BorderSide(color: context.appColors.primary, width: 2),
            borderRadius: BorderRadius.zero,
          ),
        ),
      ),
    );
  }
}

class _SettingsGroup extends StatelessWidget {
  const _SettingsGroup({
    required this.group,
    required this.items,
    required this.open,
    required this.onToggle,
    required this.onItemTap,
  });

  final SettingsGroup group;
  final List<SettingsNavItem> items;
  final bool open;
  final VoidCallback onToggle;
  final void Function(SettingsNavItem item) onItemTap;

  @override
  Widget build(BuildContext context) {
    final label = settingsGroupLabels[group] ?? group.name;

    return Container(
      decoration: BoxDecoration(
        color: context.appColors.card,
        border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
        boxShadow: [
          BoxShadow(color: context.appColors.shadow, offset: Offset(2, 2), blurRadius: 0),
        ],
      ),
      clipBehavior: Clip.hardEdge,
      child: Column(
        children: [
          InkWell(
            onTap: onToggle,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      label.toUpperCase(),
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.4,
                        color: context.appColors.mutedForeground,
                      ),
                    ),
                  ),
                  Icon(
                    open ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                    size: 20,
                    color: context.appColors.mutedForeground,
                  ),
                ],
              ),
            ),
          ),
          if (open)
            for (var i = 0; i < items.length; i++) ...[
              if (i > 0) Divider(height: 1, color: context.appColors.border.withValues(alpha: 0.25)),
              _SettingsNavRow(item: items[i], onTap: () => onItemTap(items[i])),
            ],
        ],
      ),
    );
  }
}

class _SettingsNavRow extends StatelessWidget {
  const _SettingsNavRow({required this.item, required this.onTap});

  final SettingsNavItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Icon(item.icon, size: 20, color: context.appColors.primary),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  item.label.toUpperCase(),
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.6,
                  ),
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: context.appColors.mutedForeground.withValues(alpha: 0.6)),
            ],
          ),
        ),
      ),
    );
  }
}

class _LogoutButton extends StatelessWidget {
  const _LogoutButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onTap,
      icon: const Icon(Icons.logout_rounded, size: 18),
      label: const Text('LOG OUT'),
      style: OutlinedButton.styleFrom(
        foregroundColor: context.appColors.destructive,
        side: BorderSide(color: context.appColors.destructive.withValues(alpha: 0.85), width: 2),
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      ),
    );
  }
}

class SettingsEditProfileScreen extends StatefulWidget {
  const SettingsEditProfileScreen({super.key});

  @override
  State<SettingsEditProfileScreen> createState() => _SettingsEditProfileScreenState();
}

class _SettingsEditProfileScreenState extends State<SettingsEditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _fullName;
  late final TextEditingController _username;
  late final TextEditingController _bio;
  late final TextEditingController _portfolio;
  late final TextEditingController _linkedin;
  late final TextEditingController _github;
  late final TextEditingController _instagram;
  late final TextEditingController _youtube;

  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _fullName = TextEditingController();
    _username = TextEditingController();
    _bio = TextEditingController();
    _portfolio = TextEditingController();
    _linkedin = TextEditingController();
    _github = TextEditingController();
    _instagram = TextEditingController();
    _youtube = TextEditingController();
    _applyUserToForm(context.read<AuthState>().user);
  }

  void _applyUserToForm(UserSummary? user) {
    _fullName.text = user?.fullName ?? '';
    _username.text = user?.username ?? '';
    _bio.text = user?.bio ?? '';
    _portfolio.text = user?.portfolioUrl ?? '';
    _linkedin.text = user?.linkedin ?? '';
    _github.text = user?.github ?? '';
    _instagram.text = user?.instagram ?? '';
    _youtube.text = user?.youtube ?? '';
  }

  @override
  void dispose() {
    _fullName.dispose();
    _username.dispose();
    _bio.dispose();
    _portfolio.dispose();
    _linkedin.dispose();
    _github.dispose();
    _instagram.dispose();
    _youtube.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);

    final auth = context.read<AuthState>();
    final basicErr = await auth.updateProfileSection('basic', {
      'fullName': _fullName.text.trim(),
      'username': _username.text.trim().toLowerCase(),
      'bio': _bio.text.trim(),
      'portfolioUrl': _portfolio.text.trim(),
    });
    if (!mounted) return;
    if (basicErr != null) {
      setState(() => _saving = false);
      AppFeedbackToast.error(context, basicErr);
      return;
    }

    final socialErr = await auth.updateProfileSection('social', {
      'linkedin': _linkedin.text.trim(),
      'github': _github.text.trim(),
      'instagram': _instagram.text.trim(),
      'youtube': _youtube.text.trim(),
    });
    if (!mounted) return;
    setState(() => _saving = false);
    if (socialErr != null) {
      AppFeedbackToast.error(context, socialErr);
      return;
    }
    AppFeedbackToast.success(context, 'Profile saved.');
  }

  void _openImageUpload(ProfileImageUploadKind kind) {
    ProfileImageUploadDialog.show(context, kind);
  }

  Future<void> _reset() async {
    await context.read<AuthState>().refreshUser();
    if (!mounted) return;
    _applyUserToForm(context.read<AuthState>().user);
    _formKey.currentState?.reset();
  }

  Future<void> _pullRefresh() async {
    await context.read<AuthState>().refreshUser();
    if (!mounted) return;
    setState(() => _applyUserToForm(context.read<AuthState>().user));
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    const avatarSize = 80.0;
    const bannerHeight = 128.0;

    return Scaffold(
      backgroundColor: context.appColors.background,
      appBar: const ScreenAppBar(title: 'Edit Profile'),
      body: AppPullToRefresh(
        onRefresh: _pullRefresh,
        child: Form(
          key: _formKey,
          child: ListView(
            physics: AppPullToRefresh.scrollPhysics,
            padding: EdgeInsets.zero,
            children: [
            EditProfileHero(
              user: user,
              bannerHeight: bannerHeight,
              avatarSize: avatarSize,
              onEditCover: () => _openImageUpload(ProfileImageUploadKind.cover),
              onEditAvatar: () => _openImageUpload(ProfileImageUploadKind.avatar),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AuthTextField(
                    controller: _fullName,
                    label: 'FULL NAME',
                    rule: AppFieldRule.fullNameProfile,
                    textCapitalization: TextCapitalization.words,
                  ),
                  const SizedBox(height: 12),
                  AuthTextField(
                    controller: _username,
                    label: 'USERNAME',
                    rule: AppFieldRule.username,
                  ),
                  const SizedBox(height: 12),
                  AuthTextField(
                    controller: _bio,
                    label: 'BIO',
                    rule: AppFieldRule.bio,
                    keyboardType: TextInputType.multiline,
                    minLines: 4,
                    maxLines: 8,
                    textCapitalization: TextCapitalization.sentences,
                  ),
                  const SizedBox(height: 20),
                  EditProfilePortfolioCard(controller: _portfolio),
                  const SizedBox(height: 20),
                  EditProfileSocialCard(
                    linkedin: _linkedin,
                    github: _github,
                    instagram: _instagram,
                    youtube: _youtube,
                  ),
                  const SizedBox(height: 28),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _saving ? null : _reset,
                          child: Text(
                            'RESET',
                            style: GoogleFonts.inter(fontWeight: FontWeight.w900, letterSpacing: 0.8),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _saving ? null : _save,
                          child: _saving
                              ? SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Theme.of(context).colorScheme.onPrimary,
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
