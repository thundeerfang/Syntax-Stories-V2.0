import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/squad_feed_row.dart';
import '../../models/squad_member.dart';
import '../../models/squad_summary.dart';
import '../../services/api_errors.dart';
import '../../services/auth_api.dart';
import '../../services/squad_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/blog_navigation.dart';
import '../../utils/resolve_profile_media_url.dart';
import '../../utils/squad_category.dart';
import '../../widgets/auth/auth_button.dart';
import '../../widgets/blog/blog_card.dart';
import '../../widgets/squads/squad_detail_skeleton.dart';
import '../../widgets/squads/squad_members_sheet.dart';
import '../../widgets/ui/app_confirm_dialog.dart';
import '../../widgets/ui/app_feedback_toast.dart';
import '../../widgets/ui/app_pull_to_refresh.dart';
import '../../widgets/squads/squad_overflow_menu.dart';
import '../../widgets/navigation/screen_app_bar.dart';

class SquadDetailScreen extends StatefulWidget {
  const SquadDetailScreen({
    super.key,
    required this.slug,
    this.preview,
  });

  final String slug;
  final SquadSummary? preview;

  @override
  State<SquadDetailScreen> createState() => _SquadDetailScreenState();
}

class _SquadDetailScreenState extends State<SquadDetailScreen> {
  final _api = SquadApi();
  final _inviteController = TextEditingController();

  SquadSummary? _squad;
  List<SquadFeedRow> _feed = const [];
  List<SquadMember> _members = const [];
  int _pinnedCount = 0;
  bool _showPinnedOnly = false;
  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _inviteController.dispose();
    super.dispose();
  }

  String? get _token => context.read<AuthState>().accessToken;

  bool _isGated(SquadSummary squad) {
    final resolved = squad.withResolvedFields();
    return resolved.viewerNeedsInvite || (resolved.isPrivate && !resolved.isMember);
  }

  Future<void> _load() async {
    setState(() {
      _loading = _squad == null;
      _error = null;
    });

    try {
      final squad = await _api.getBySlug(slug: widget.slug, bearer: _token);
      if (!mounted) return;

      if (_isGated(squad)) {
        setState(() {
          _squad = squad.withResolvedFields();
          _feed = const [];
          _members = const [];
          _pinnedCount = 0;
          _loading = false;
        });
        return;
      }

      final feedResult = await _api.getFeed(slug: widget.slug, bearer: _token, limit: 30);
      List<SquadMember> members = const [];
      try {
        members = await _api.listMembers(slug: widget.slug, bearer: _token);
      } catch (_) {
        members = const [];
      }

      if (!mounted) return;
      setState(() {
        _squad = squad.withResolvedFields();
        _feed = feedResult.feed;
        _pinnedCount = feedResult.pinnedCount;
        _members = members;
        _loading = false;
        if (_pinnedCount == 0) _showPinnedOnly = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is AuthApiException ? e.message : kGenericUserError;
      });
    }
  }

  Future<void> _deleteSquad() async {
    final token = _token;
    final squad = _squad?.withResolvedFields();
    if (token == null || token.isEmpty || squad == null) return;

    final confirmed = await AppConfirmDialog.show(
      context,
      title: 'Delete squad?',
      message:
          'This permanently deletes ${squad.name} and cannot be undone.',
      confirmLabel: 'DELETE',
      variant: AppConfirmDialogVariant.danger,
    );
    if (confirmed != true || !mounted) return;

    setState(() => _busy = true);
    try {
      await _api.delete(slug: squad.slug, bearer: token);
      if (!mounted) return;
      AppFeedbackToast.success(context, 'Squad deleted');
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(context, e is AuthApiException ? e.message : kGenericUserError);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _onEditSquad() {
    AppFeedbackToast.warning(context, 'Squad editor coming soon on mobile.');
  }

  Future<void> _join() async {
    final token = _token;
    if (token == null || token.isEmpty) {
      AppFeedbackToast.warning(context, 'Sign in to join squads.');
      return;
    }
    final squad = _squad;
    if (squad == null) return;

    setState(() => _busy = true);
    try {
      await _api.join(
        slug: squad.slug,
        bearer: token,
        inviteToken: squad.isPrivate ? _inviteController.text.trim() : null,
      );
      if (!mounted) return;
      AppFeedbackToast.success(context, 'Joined squad');
      _inviteController.clear();
      await _load();
    } catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(context, e is AuthApiException ? e.message : kGenericUserError);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _leave() async {
    final token = _token;
    final squad = _squad;
    if (token == null || token.isEmpty || squad == null) return;

    final confirmed = await AppConfirmDialog.show(
      context,
      title: 'Leave squad?',
      message: 'You will stop seeing ${squad.name} in your squads and lose access to its feed.',
      confirmLabel: 'LEAVE',
      variant: AppConfirmDialogVariant.warning,
    );
    if (confirmed != true || !mounted) return;

    setState(() => _busy = true);
    try {
      await _api.leave(slug: squad.slug, bearer: token);
      if (!mounted) return;
      AppFeedbackToast.success(context, 'Left squad');
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(context, e is AuthApiException ? e.message : kGenericUserError);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _copyInvite() async {
    final squad = _squad;
    final token = squad?.inviteToken;
    if (squad == null || token == null || token.isEmpty) return;
    final text =
        'Join our squad on Syntax Stories\n/squads/${squad.slug}\nInvite code: $token';
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    AppFeedbackToast.success(context, 'Invitation copied');
  }

  void _openMembers() {
    final squad = _squad;
    if (squad == null) return;
    showSquadMembersSheet(
      context,
      members: _members,
      creatorUserId: squad.creatorUserId,
    );
  }

  List<SquadFeedRow> get _displayedFeed {
    if (!_showPinnedOnly) return _feed;
    return _feed.where((r) => r.pinned).toList();
  }

  Widget _buildFeedRow(SquadFeedRow row) {
    final shareChrome = row.isShared && row.sharedBy != null
        ? BlogCardShareChrome(
            username: row.sharedBy!.username,
            fullName: row.sharedBy!.fullName,
            profileImg: row.sharedBy!.profileImg,
          )
        : null;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: BlogCard(
        post: row.item,
        shareChrome: shareChrome,
        onTap: () => openBlogFeedPost(context, row.item),
      ),
    );
  }

  List<Widget> _buildFeedSection(SquadSummary squad) {
    final displayedFeed = _displayedFeed;

    if (!squad.feedVisible) {
      return [
        Text(
          'Join this squad to see the feed.',
          style: GoogleFonts.inter(fontSize: 14, color: context.appColors.mutedForeground),
        ),
      ];
    }

    if (_feed.isEmpty) {
      return [_EmptyFeed(colors: context.appColors)];
    }

    if (displayedFeed.isEmpty) {
      return [
        Text(
          'No pinned posts yet. Squad admins can pin posts from the feed.',
          style: GoogleFonts.inter(fontSize: 14, color: context.appColors.mutedForeground),
        ),
      ];
    }

    if (_showPinnedOnly) {
      return displayedFeed.map(_buildFeedRow).toList();
    }

    final pinnedRows = displayedFeed.where((r) => r.pinned).toList();
    final regularRows = displayedFeed.where((r) => !r.pinned).toList();
    final out = <Widget>[];

    if (pinnedRows.isNotEmpty) {
      out.add(_PinnedSectionHeader(count: _pinnedCount));
      out.add(const SizedBox(height: 12));
      out.addAll(pinnedRows.map(_buildFeedRow));
      if (regularRows.isNotEmpty) out.add(const SizedBox(height: 4));
    }

    out.addAll(regularRows.map(_buildFeedRow));
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Scaffold(
      backgroundColor: colors.background,
      appBar: const ScreenAppBar(title: 'Squad'),
      body: _buildBody(colors),
    );
  }

  Widget _buildBody(AppColorTokens colors) {
    if (_loading && _squad == null) {
      return const SquadDetailSkeleton();
    }

    if (_error != null && _squad == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: colors.mutedForeground),
              ),
              const SizedBox(height: 16),
              TextButton(onPressed: _load, child: const Text('Try again')),
            ],
          ),
        ),
      );
    }

    final raw = _squad;
    if (raw == null) return const SizedBox.shrink();

    final squad = raw.withResolvedFields();
    final feedVisible = squad.feedVisible;
    final staffSorted = sortSquadStaff(_members, creatorUserId: squad.creatorUserId);
    final facepile = shuffleMembersWithSeed(_members, widget.slug).take(5).toList();
    final modShown = staffSorted.take(4).toList();
    final modMore = staffSorted.length - modShown.length;

    return AppPullToRefresh(
      onRefresh: _load,
      child: ListView(
        physics: AppPullToRefresh.scrollPhysics,
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          _SquadDetailHeader(
            squad: squad,
            facepile: facepile,
            staffShown: modShown,
            staffMore: modMore,
            feedVisible: feedVisible,
            busy: _busy,
            inviteController: _inviteController,
            pinnedCount: _pinnedCount,
            showPinnedOnly: _showPinnedOnly,
            onJoin: _join,
            onOpenMembers: _openMembers,
            onTogglePinned: () {
              if (_pinnedCount == 0 && !_showPinnedOnly) return;
              setState(() => _showPinnedOnly = !_showPinnedOnly);
            },
            onLeave: squad.isMember ? _leave : null,
            onEdit: squad.isAdmin && (_token?.isNotEmpty == true) ? _onEditSquad : null,
            onDelete: squad.isAdmin && (_token?.isNotEmpty == true) ? _deleteSquad : null,
            onCopyInvite: squad.isAdmin && squad.isPrivate && squad.inviteToken != null
                ? _copyInvite
                : null,
          ),
          const SizedBox(height: 20),
          ..._buildFeedSection(squad),
        ],
      ),
    );
  }
}

class _SquadDetailHeader extends StatelessWidget {
  const _SquadDetailHeader({
    required this.squad,
    required this.facepile,
    required this.staffShown,
    required this.staffMore,
    required this.feedVisible,
    required this.busy,
    required this.inviteController,
    required this.pinnedCount,
    required this.showPinnedOnly,
    required this.onJoin,
    required this.onOpenMembers,
    required this.onTogglePinned,
    this.onLeave,
    this.onEdit,
    this.onDelete,
    this.onCopyInvite,
  });

  final SquadSummary squad;
  final List<SquadMember> facepile;
  final List<SquadMember> staffShown;
  final int staffMore;
  final bool feedVisible;
  final bool busy;
  final TextEditingController inviteController;
  final int pinnedCount;
  final bool showPinnedOnly;
  final VoidCallback onJoin;
  final VoidCallback onOpenMembers;
  final VoidCallback onTogglePinned;
  final VoidCallback? onLeave;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final VoidCallback? onCopyInvite;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final onPrimary = colors.primaryForeground;
    final banner = resolveProfileMediaUrl(squad.coverBannerUrl);
    final icon = resolveProfileMediaUrl(squad.iconUrl);
    final createdLabel = formatSquadCreated(squad.createdAt);
    final description = squad.description.trim();
    final categoryLabel =
        squad.isPublic && squad.category != null ? squadCategoryLabel(squad.category) : null;
    final isMember = squad.isMember;

    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: colors.border, width: 4),
        boxShadow: [
          BoxShadow(
            color: colors.shadow.withValues(alpha: 0.12),
            offset: const Offset(0, 4),
            blurRadius: 0,
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          Positioned.fill(
            child: _BannerLayer(bannerUrl: banner, primary: primary, colors: colors),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (createdLabel.isNotEmpty)
                  Align(
                    alignment: Alignment.topRight,
                    child: Text(
                      'Created $createdLabel',
                      style: GoogleFonts.jetBrainsMono(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: Colors.white.withValues(alpha: 0.75),
                      ),
                    ),
                  ),
                const SizedBox(height: 8),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SquadIconBadge(
                      iconUrl: icon,
                      name: squad.name,
                      isPrivate: squad.isPrivate,
                      primary: primary,
                      onPrimary: onPrimary,
                      colors: colors,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            crossAxisAlignment: WrapCrossAlignment.center,
                            spacing: 8,
                            runSpacing: 4,
                            children: [
                              Text(
                                squad.name.toUpperCase(),
                                style: GoogleFonts.inter(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                  fontStyle: FontStyle.italic,
                                  height: 1.1,
                                  letterSpacing: -0.4,
                                  color: Colors.white,
                                ),
                              ),
                              if (categoryLabel != null && categoryLabel.isNotEmpty)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: primary,
                                    border: Border.all(color: primary, width: 2),
                                  ),
                                  child: Text(
                                    categoryLabel.toUpperCase(),
                                    style: GoogleFonts.jetBrainsMono(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w800,
                                      color: onPrimary,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          if (description.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(
                              description,
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                height: 1.35,
                                color: Colors.white.withValues(alpha: 0.82),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 12,
                  runSpacing: 8,
                  children: [
                    _StatLabel(
                      text: '${_formatCount(squad.postCount)} ${squad.postCount == 1 ? 'post' : 'posts'}',
                    ),
                    _StatLabel(text: '${_formatCount(squad.viewCount)} views'),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SquadFacepile(members: facepile),
                        if (facepile.isNotEmpty) const SizedBox(width: 6),
                        _StatLabel(text: '${_formatCount(squad.memberCount)} members'),
                      ],
                    ),
                    if (feedVisible && staffShown.isNotEmpty)
                      ...staffShown.map(
                        (m) => SquadStaffChip(member: m, onTap: onOpenMembers),
                      ),
                    if (feedVisible && staffMore > 0)
                      _MoreStaffChip(count: staffMore, onTap: onOpenMembers),
                    if (feedVisible && staffShown.isEmpty)
                      _MutedStat('No staff listed'),
                    if (!feedVisible) _MutedStat('· Join to see staff'),
                  ],
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (!isMember) ...[
                      AuthButton(
                        label: 'Join squad',
                        loadingLabel: 'Joining…',
                        loading: busy,
                        expand: false,
                        variant: AuthButtonVariant.primary,
                        onPressed: busy ? null : onJoin,
                      ),
                      if (squad.isPrivate)
                        SizedBox(
                          width: 140,
                          height: 44,
                          child: TextField(
                            controller: inviteController,
                            style: GoogleFonts.jetBrainsMono(fontSize: 11, color: colors.foreground),
                            decoration: InputDecoration(
                              hintText: 'Invite code',
                              hintStyle: GoogleFonts.jetBrainsMono(
                                fontSize: 11,
                                color: colors.mutedForeground,
                              ),
                              filled: true,
                              fillColor: colors.background,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 10),
                              border: OutlineInputBorder(
                                borderSide: BorderSide(color: colors.border, width: 2),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderSide: BorderSide(color: colors.border, width: 2),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderSide: BorderSide(color: primary, width: 2),
                              ),
                            ),
                          ),
                        ),
                    ],
                    _HeaderActionButton(
                      label: 'Members',
                      icon: Icons.groups_rounded,
                      active: false,
                      onTap: onOpenMembers,
                    ),
                    if (feedVisible)
                      _HeaderActionButton(
                        label: 'Pinned',
                        icon: Icons.push_pin_rounded,
                        active: showPinnedOnly,
                        badge: '$pinnedCount',
                        onTap: pinnedCount == 0 && !showPinnedOnly ? null : onTogglePinned,
                      ),
                    SquadOverflowMenu(
                      onLeave: onLeave,
                      onEdit: onEdit,
                      onDelete: onDelete,
                      onCopyInvite: onCopyInvite,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatCount(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(n >= 10000000 ? 0 : 1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(n >= 10000 ? 0 : 1)}K';
    return '$n';
  }
}

class _BannerLayer extends StatelessWidget {
  const _BannerLayer({
    required this.bannerUrl,
    required this.primary,
    required this.colors,
  });

  final String? bannerUrl;
  final Color primary;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        if (bannerUrl != null && bannerUrl!.isNotEmpty)
          Image.network(
            bannerUrl!,
            fit: BoxFit.cover,
            errorBuilder: (_, _, _) => _gradient(primary, colors),
          )
        else
          _gradient(primary, colors),
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.bottomCenter,
              end: Alignment.topCenter,
              colors: [
                Colors.black.withValues(alpha: 0.92),
                Colors.black.withValues(alpha: 0.55),
                Colors.black.withValues(alpha: 0.15),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _gradient(Color primary, AppColorTokens colors) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            primary,
            colors.primaryHover,
            Color.lerp(primary, colors.muted, 0.35)!,
          ],
        ),
      ),
    );
  }
}

class _SquadIconBadge extends StatelessWidget {
  const _SquadIconBadge({
    required this.iconUrl,
    required this.name,
    required this.isPrivate,
    required this.primary,
    required this.onPrimary,
    required this.colors,
  });

  final String? iconUrl;
  final String name;
  final bool isPrivate;
  final Color primary;
  final Color onPrimary;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'S';
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            border: Border.all(color: colors.border, width: 3),
            color: primary,
            boxShadow: [
              BoxShadow(
                color: colors.shadow.withValues(alpha: 0.2),
                offset: const Offset(2, 2),
                blurRadius: 0,
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: iconUrl != null && iconUrl!.isNotEmpty
              ? Image.network(iconUrl!, fit: BoxFit.cover)
              : Center(
                  child: Text(
                    initial,
                    style: GoogleFonts.inter(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: onPrimary,
                    ),
                  ),
                ),
        ),
        if (isPrivate)
          Positioned(
            right: -4,
            top: -4,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFFFFD400),
                border: Border.all(color: colors.border, width: 2),
              ),
              child: Icon(Icons.lock_rounded, size: 12, color: colors.foreground),
            ),
          ),
      ],
    );
  }
}

class _StatLabel extends StatelessWidget {
  const _StatLabel({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: GoogleFonts.inter(
        fontSize: 9,
        fontWeight: FontWeight.w900,
        letterSpacing: 1.2,
        color: Colors.white.withValues(alpha: 0.9),
      ),
    );
  }
}

class _MutedStat extends StatelessWidget {
  const _MutedStat(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: GoogleFonts.inter(
        fontSize: 9,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.8,
        color: Colors.white.withValues(alpha: 0.55),
      ),
    );
  }
}

class _MoreStaffChip extends StatelessWidget {
  const _MoreStaffChip({required this.count, required this.onTap});

  final int count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
          decoration: BoxDecoration(
            border: Border.all(color: primary.withValues(alpha: 0.5), width: 2, style: BorderStyle.solid),
          ),
          child: Text(
            '+$count more'.toUpperCase(),
            style: GoogleFonts.jetBrainsMono(
              fontSize: 8,
              fontWeight: FontWeight.w900,
              color: primary,
            ),
          ),
        ),
      ),
    );
  }
}

class _HeaderActionButton extends StatelessWidget {
  const _HeaderActionButton({
    required this.label,
    required this.icon,
    required this.active,
    required this.onTap,
    this.badge,
  });

  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback? onTap;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Opacity(
          opacity: onTap == null ? 0.4 : 1,
          child: Container(
            height: 40,
            padding: const EdgeInsets.symmetric(horizontal: 10),
            decoration: BoxDecoration(
              border: Border.all(
                color: active ? primary : Colors.white.withValues(alpha: 0.7),
                width: 2,
              ),
              color: active ? primary.withValues(alpha: 0.25) : Colors.black.withValues(alpha: 0.5),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 16, color: active ? primary : Colors.white),
                const SizedBox(width: 6),
                Text(
                  label.toUpperCase(),
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.6,
                    color: active ? primary : Colors.white,
                  ),
                ),
                if (badge != null) ...[
                  const SizedBox(width: 6),
                  Container(
                    width: 20,
                    height: 20,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.white.withValues(alpha: 0.4)),
                      color: Colors.black.withValues(alpha: 0.5),
                    ),
                    child: Text(
                      badge!,
                      style: GoogleFonts.inter(
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PinnedSectionHeader extends StatelessWidget {
  const _PinnedSectionHeader({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final onPrimary = colors.primaryForeground;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: primary,
        border: Border.all(color: primary, width: 2),
        boxShadow: [
          BoxShadow(
            color: colors.shadow.withValues(alpha: 0.12),
            offset: const Offset(3, 3),
            blurRadius: 0,
          ),
        ],
      ),
      child: Row(
        children: [
          Icon(Icons.push_pin_rounded, size: 18, color: onPrimary),
          const SizedBox(width: 8),
          Text(
            'PINNED',
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.8,
              color: onPrimary,
            ),
          ),
          const Spacer(),
          Container(
            constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(horizontal: 6),
            decoration: BoxDecoration(
              border: Border.all(color: onPrimary.withValues(alpha: 0.45), width: 1.5),
              color: Colors.black.withValues(alpha: 0.18),
            ),
            child: Text(
              '$count',
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w900,
                color: onPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyFeed extends StatelessWidget {
  const _EmptyFeed({required this.colors});

  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 48),
      decoration: BoxDecoration(
        border: Border.all(color: colors.border, width: 4),
      ),
      child: Column(
        children: [
          Icon(Icons.forum_outlined, size: 48, color: colors.mutedForeground.withValues(alpha: 0.3)),
          const SizedBox(height: 12),
          Text(
            'STATIC DETECTED. NO SIGNALS FOUND.',
            style: GoogleFonts.jetBrainsMono(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: colors.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}
