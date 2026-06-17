import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/squad_summary.dart';
import '../../services/api_errors.dart';
import '../../services/auth_api.dart';
import '../../services/squad_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../widgets/auth/auth_button.dart';
import '../../widgets/navigation/screen_app_bar.dart';
import '../../widgets/profile/profile_activity_shared.dart';
import '../../widgets/profile/profile_followed_squads_stack.dart';
import '../../utils/squad_navigation.dart';
import '../../widgets/ui/app_feedback_toast.dart';
import '../../widgets/ui/app_pull_to_refresh.dart';

int _squadCreatedMs(SquadSummary squad) {
  final raw = squad.createdAt;
  if (raw == null || raw.isEmpty) return 0;
  return DateTime.tryParse(raw)?.millisecondsSinceEpoch ?? 0;
}

List<SquadSummary> _sortSquads(List<SquadSummary> squads, String sort) {
  final rows = [...squads];
  rows.sort((a, b) {
    final aMs = _squadCreatedMs(a);
    final bMs = _squadCreatedMs(b);
    final byDate = sort == 'oldest' ? aMs.compareTo(bMs) : bMs.compareTo(aMs);
    if (byDate != 0) return byDate;
    return a.name.compareTo(b.name);
  });
  return rows;
}

class MySquadsScreen extends StatefulWidget {
  const MySquadsScreen({super.key});

  @override
  State<MySquadsScreen> createState() => _MySquadsScreenState();
}

class _MySquadsScreenState extends State<MySquadsScreen> {
  final _api = SquadApi();

  List<SquadSummary> _squads = const [];
  String _sort = 'newest';
  String? _toggleBusySlug;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      if (!mounted) return;
      setState(() {
        _squads = const [];
        _loading = false;
        _error = 'Sign in to view your squads.';
      });
      return;
    }

    try {
      final result = await _api.listMine(bearer: token);
      if (!mounted) return;
      setState(() {
        _squads = result.squads;
        _loading = false;
      });
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _squads = const [];
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load your squads.';
        _squads = const [];
        _loading = false;
      });
    }
  }

  void _onSquadTap(SquadSummary squad) {
    openSquadSummary(context, squad);
  }

  Future<void> _onToggleFollow(SquadSummary squad) async {
    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      AppFeedbackToast.warning(context, 'Sign in to manage squads.');
      return;
    }

    setState(() => _toggleBusySlug = squad.slug);
    try {
      if (squad.isMember) {
        await _api.leave(slug: squad.slug, bearer: token);
        if (!mounted) return;
        setState(() => _squads = _squads.where((s) => s.id != squad.id).toList());
        AppFeedbackToast.success(context, 'Left squad');
      } else {
        await _api.join(slug: squad.slug, bearer: token);
        if (!mounted) return;
        AppFeedbackToast.success(context, 'Joined squad');
        await _load();
      }
    } on AuthApiException catch (e) {
      if (!mounted) return;
      AppFeedbackToast.error(context, e.message);
    } catch (_) {
      if (!mounted) return;
      AppFeedbackToast.error(context, kGenericUserError);
    } finally {
      if (mounted) setState(() => _toggleBusySlug = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final sortedSquads = _sortSquads(_squads, _sort);

    return Scaffold(
      backgroundColor: colors.background,
      appBar: const ScreenAppBar(title: 'My Squads'),
      body: AppPullToRefresh(
        onRefresh: _load,
        child: _buildBody(colors, primary, sortedSquads),
      ),
    );
  }

  Widget _buildBody(AppColorTokens colors, Color primary, List<SquadSummary> sortedSquads) {
    final countLabel = '${sortedSquads.length} ${sortedSquads.length == 1 ? 'squad' : 'squads'}';

    if (_loading) {
      return ListView(
        physics: AppPullToRefresh.scrollPhysics,
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        children: [
          _MySquadsToolbarCard(
            count: 0,
            countLabel: '0 squads',
            sortValue: _sort,
            onSortChanged: (value) => setState(() => _sort = value),
            primary: primary,
            colors: colors,
          ),
          const SizedBox(height: 16),
          const _MySquadRowSkeleton(),
          const SizedBox(height: 12),
          const _MySquadRowSkeleton(),
          const SizedBox(height: 12),
          const _MySquadRowSkeleton(),
        ],
      );
    }

    if (_error != null) {
      return ListView(
        physics: AppPullToRefresh.scrollPhysics,
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        children: [
          _MySquadsToolbarCard(
            count: 0,
            countLabel: '0 squads',
            sortValue: _sort,
            onSortChanged: (value) => setState(() => _sort = value),
            primary: primary,
            colors: colors,
          ),
          const SizedBox(height: 16),
          ProfileActivityError(message: _error!, onRetry: _load),
        ],
      );
    }

    if (_squads.isEmpty) {
      return ListView(
        physics: AppPullToRefresh.scrollPhysics,
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        children: [
          _MySquadsToolbarCard(
            count: 0,
            countLabel: countLabel,
            sortValue: _sort,
            onSortChanged: (value) => setState(() => _sort = value),
            primary: primary,
            colors: colors,
          ),
          const SizedBox(height: 24),
          const ProfileActivityEmpty(
            icon: Icons.groups_outlined,
            title: 'No squads yet',
            message: 'Join or create a squad from the Squads tab.',
          ),
        ],
      );
    }

    return ListView.separated(
      physics: AppPullToRefresh.scrollPhysics,
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      itemCount: sortedSquads.length + 1,
      separatorBuilder: (context, index) => SizedBox(height: index == 0 ? 16 : 0),
      itemBuilder: (context, index) {
        if (index == 0) {
          return _MySquadsToolbarCard(
            count: sortedSquads.length,
            countLabel: countLabel,
            sortValue: _sort,
            onSortChanged: (value) => setState(() => _sort = value),
            primary: primary,
            colors: colors,
          );
        }

        final squad = sortedSquads[index - 1];
        return _MySquadRow(
          squad: squad,
          busy: _toggleBusySlug == squad.slug,
          onTap: () => _onSquadTap(squad),
          onToggleFollow: () => _onToggleFollow(squad),
        );
      },
    );
  }
}

class _MySquadsToolbarCard extends StatelessWidget {
  const _MySquadsToolbarCard({
    required this.count,
    required this.countLabel,
    required this.sortValue,
    required this.onSortChanged,
    required this.primary,
    required this.colors,
  });

  final int count;
  final String countLabel;
  final String sortValue;
  final ValueChanged<String> onSortChanged;
  final Color primary;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colors.card,
        border: Border.all(color: colors.border, width: 2),
        boxShadow: [
          BoxShadow(
            color: colors.shadow.withValues(alpha: 0.1),
            offset: const Offset(3, 3),
            blurRadius: 0,
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Row(
              children: [
                Text(
                  'TOTAL SQUADS',
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.1,
                    color: colors.foreground,
                  ),
                ),
                const SizedBox(width: 8),
                ProfileCountPill(count: count, semanticLabel: countLabel),
              ],
            ),
          ),
          const SizedBox(width: 8),
          ProfileSortSelect(
            value: sortValue,
            options: kNewestOldestSortOptions,
            onChanged: onSortChanged,
            minWidth: 112,
          ),
        ],
      ),
    );
  }
}

class _MySquadRow extends StatelessWidget {
  const _MySquadRow({
    required this.squad,
    required this.onTap,
    required this.onToggleFollow,
    this.busy = false,
  });

  final SquadSummary squad;
  final VoidCallback onTap;
  final VoidCallback onToggleFollow;
  final bool busy;

  Color _rowDividerColor(AppColorTokens colors) =>
      colors.foreground.withValues(alpha: 0.12);

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final description = squad.description.trim();
    final following = squad.isMember;

    return Material(
      color: colors.background,
      child: InkWell(
        canRequestFocus: false,
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(color: _rowDividerColor(colors), width: 1),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              ProfileSquadLogo(
                squad: squad,
                size: 48,
                colors: colors,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      squad.name.toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.4,
                        color: colors.foreground,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description.isNotEmpty ? description : 'No description yet.',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        fontStyle: description.isEmpty ? FontStyle.italic : FontStyle.normal,
                        color: description.isEmpty
                            ? colors.mutedForeground
                            : colors.mutedForeground.withValues(alpha: 0.9),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              AuthButton(
                label: following ? 'Unfollow' : 'Follow',
                loadingLabel: following ? 'Leaving…' : 'Joining…',
                loading: busy,
                expand: false,
                variant: AuthButtonVariant.primary,
                onPressed: busy ? null : onToggleFollow,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MySquadRowSkeleton extends StatelessWidget {
  const _MySquadRowSkeleton();

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Container(
      height: 72,
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: colors.foreground.withValues(alpha: 0.12), width: 1),
        ),
      ),
      child: ColoredBox(color: colors.muted.withValues(alpha: 0.18)),
    );
  }
}
