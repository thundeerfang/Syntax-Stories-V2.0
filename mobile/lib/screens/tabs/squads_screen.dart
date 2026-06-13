import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/squad_summary.dart';
import '../../services/api_errors.dart';
import '../../services/auth_api.dart';
import '../../services/squad_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/squad_category.dart';
import '../../widgets/navigation/main_app_bar.dart';
import '../../widgets/squads/squad_discover_card.dart';
import '../../widgets/squads/squad_filter_chips.dart';
import '../../widgets/ui/app_pull_to_refresh.dart';

List<SquadSummary> mergeSquadCatalog(List<SquadSummary> publicSquads, List<SquadSummary> mine) {
  final byId = <String, SquadSummary>{};
  for (final s in publicSquads) {
    byId[s.id] = s;
  }
  for (final s in mine) {
    byId[s.id] = s;
  }
  return byId.values.toList();
}

int _squadCreatedMs(SquadSummary s) {
  final raw = s.createdAt;
  if (raw == null || raw.isEmpty) return 0;
  return DateTime.tryParse(raw)?.millisecondsSinceEpoch ?? 0;
}

List<SquadSummary> sortSquadsNewest(List<SquadSummary> list) {
  final next = [...list];
  next.sort((a, b) {
    final byDate = _squadCreatedMs(b).compareTo(_squadCreatedMs(a));
    if (byDate != 0) return byDate;
    return a.name.compareTo(b.name);
  });
  return next;
}

class SquadsScreen extends StatefulWidget {
  const SquadsScreen({super.key});

  @override
  State<SquadsScreen> createState() => SquadsScreenState();
}

class SquadsScreenState extends State<SquadsScreen> {
  final _api = SquadApi();
  SquadBrowseFilter _filter = const SquadBrowseFilterAll();
  List<SquadSummary> _publicSquads = const [];
  List<SquadSummary> _mine = const [];
  bool _loading = true;
  String? _error;
  String? _joinBusySlug;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  /// Reload squads after create/join from another route.
  Future<void> reload() => _load();

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final token = context.read<AuthState>().accessToken;
    try {
      final pub = await _api.listPublic(limit: 96);
      final mine = token != null && token.isNotEmpty
          ? (await _api.listMine(bearer: token)).squads
          : <SquadSummary>[];
      if (!mounted) return;
      setState(() {
        _publicSquads = pub.squads;
        _mine = mine;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is AuthApiException ? e.message : kGenericUserError;
      });
    }
  }

  List<SquadSummary> get _merged => mergeSquadCatalog(_publicSquads, _mine);

  List<SquadSummary> get _filteredSquads {
    final rows = switch (_filter) {
      SquadBrowseFilterAll() => _merged,
      SquadBrowseFilterMine() => _mine,
      SquadBrowseFilterCategory(:final categoryId) => _merged
          .where((s) => s.isPublic && s.category == categoryId)
          .toList(),
    };
    return sortSquadsNewest(rows);
  }

  bool get _showMineAuthGate {
    final token = context.read<AuthState>().accessToken;
    return _filter is SquadBrowseFilterMine && (token == null || token.isEmpty);
  }

  Future<void> _onJoin(SquadSummary squad) async {
    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      _showSnack('Sign in to join squads.');
      return;
    }
    if (squad.isPrivate) {
      _showSnack('Squad detail coming soon.');
      return;
    }
    setState(() => _joinBusySlug = squad.slug);
    try {
      await _api.join(slug: squad.slug, bearer: token);
      if (!mounted) return;
      _showSnack('Joined squad');
      await _load();
    } catch (e) {
      if (!mounted) return;
      _showSnack(e is AuthApiException ? e.message : kGenericUserError);
    } finally {
      if (mounted) setState(() => _joinBusySlug = null);
    }
  }

  void _onOpen(SquadSummary squad) {
    _showSnack('Squad detail coming soon.');
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final topInset = MainAppBar.totalHeight(context);
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    const navReserve = 96.0;

    return AppPullToRefresh(
      onRefresh: _load,
      child: CustomScrollView(
        physics: AppPullToRefresh.scrollPhysics,
        slivers: [
          SliverToBoxAdapter(child: SizedBox(height: topInset)),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: SquadFilterChips(
                selected: _filter,
                onSelected: (next) => setState(() => _filter = next),
              ),
            ),
          ),
          if (_loading)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null)
            SliverFillRemaining(
              hasScrollBody: false,
              child: _SquadsEmptyState(
                icon: Icons.error_outline_rounded,
                title: 'Could not load squads',
                message: _error!,
                actionLabel: 'Try again',
                onAction: _load,
              ),
            )
          else if (_showMineAuthGate)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: _SquadsEmptyState(
                icon: Icons.groups_rounded,
                title: 'Sign in to see your squads',
                message: 'All squads and categories stay available without an account.',
              ),
            )
          else if (_filteredSquads.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: _SquadsEmptyState(
                icon: Icons.groups_rounded,
                title: _emptyTitle(),
                message: _emptyMessage(),
              ),
            )
          else
            SliverPadding(
              padding: EdgeInsets.fromLTRB(16, 0, 16, bottomInset + navReserve),
              sliver: SliverList.separated(
                itemCount: _filteredSquads.length,
                separatorBuilder: (_, _) => const SizedBox(height: 20),
                itemBuilder: (context, index) {
                  final squad = _filteredSquads[index];
                  return SquadDiscoverCard(
                    squad: squad,
                    joinBusy: _joinBusySlug == squad.slug,
                    onJoin: () => _onJoin(squad),
                    onOpen: () => _onOpen(squad),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  String _emptyTitle() {
    return switch (_filter) {
      SquadBrowseFilterMine() => 'You are not in any squads yet',
      SquadBrowseFilterCategory(:final categoryId) =>
        'No ${squadCategoryLabel(categoryId)} squads yet',
      SquadBrowseFilterAll() => 'No squads yet',
    };
  }

  String _emptyMessage() {
    return switch (_filter) {
      SquadBrowseFilterMine() => 'Join a public squad or create your own from the top bar.',
      SquadBrowseFilterCategory() => 'Try another category or check back later.',
      SquadBrowseFilterAll() => 'Be the first to create one from the top bar.',
    };
  }
}

class _SquadsEmptyState extends StatelessWidget {
  const _SquadsEmptyState({
    required this.icon,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 40, color: colors.mutedForeground),
          const SizedBox(height: 12),
          Text(
            title.toUpperCase(),
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.6,
              color: colors.foreground,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 14, color: colors.mutedForeground),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 16),
            TextButton(onPressed: onAction, child: Text(actionLabel!)),
          ],
        ],
      ),
    );
  }
}
