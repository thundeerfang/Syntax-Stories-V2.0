import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/achievement_item.dart';
import '../../services/achievements_api.dart';
import '../../services/api_errors.dart';
import '../../services/auth_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../achievements/achievement_card.dart';
import '../achievements/achievement_card_skeleton.dart';
import 'profile_activity_shared.dart';

class ProfileAchievementsPanel extends StatefulWidget {
  const ProfileAchievementsPanel({super.key});

  @override
  State<ProfileAchievementsPanel> createState() => ProfileAchievementsPanelState();
}

class ProfileAchievementsPanelState extends State<ProfileAchievementsPanel> {
  final _api = AchievementsApi();

  List<AchievementProgressItem> _items = const [];
  int _unlockedCount = 0;
  int _total = 0;
  int _totalPoints = 0;
  bool _loading = true;
  bool _waitingForAuth = false;
  String? _error;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => reload());
  }

  Future<void> reload() => _load();

  List<AchievementProgressItem> get _filtered {
    switch (_filter) {
      case 'completed':
        return _items.where((item) => item.unlocked).toList();
      case 'locked':
        return _items.where((item) => item.locked && !item.unlocked).toList();
      case 'unlocked':
        return _items
            .where((item) => item.status == AchievementStatus.inProgress)
            .toList();
      default:
        return _items;
    }
  }

  Future<void> _load() async {
    final auth = context.read<AuthState>();
    if (auth.bootstrapping) {
      setState(() {
        _loading = true;
        _waitingForAuth = true;
        _error = null;
      });
      return;
    }

    _waitingForAuth = false;
    final token = auth.accessToken;
    if (token == null || token.isEmpty) {
      setState(() {
        _loading = false;
        _items = const [];
        _error = 'Sign in to see your achievements.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      logApiInfo('Loading achievements from GET /api/achievements');
      final data = await _api.list(accessToken: token);
      if (!mounted) return;
      logApiInfo(
        'Achievements loaded: ${data.items.length} items, '
        '${data.unlockedCount}/${data.total} unlocked',
      );
      setState(() {
        _items = data.items;
        _unlockedCount = data.unlockedCount;
        _total = data.total;
        _totalPoints = data.totalPoints;
        _loading = false;
      });
    } on AuthApiException catch (e) {
      if (!mounted) return;
      logApiError(
        'Achievements request failed',
        method: 'GET',
        url: Uri.parse('${AchievementsApi().baseUrl}/api/achievements'),
        cause: e,
      );
      setState(() {
        _error = e.message;
        _items = const [];
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      logApiError(
        'Achievements request failed',
        method: 'GET',
        url: Uri.parse('${AchievementsApi().baseUrl}/api/achievements'),
        cause: e,
      );
      setState(() {
        _error = 'Could not load achievements.';
        _items = const [];
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    if (_waitingForAuth && !auth.bootstrapping) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _load();
      });
    }

    final colors = context.appColors;
    final filtered = _filtered;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_loading)
          const AchievementGridSkeleton(count: 6)
        else if (_error != null)
          ProfileActivityError(message: _error!, onRetry: _load)
        else if (_items.isEmpty)
          ProfileActivityEmpty(
            icon: Icons.emoji_events_outlined,
            title: _total > 0 ? 'Could not show achievements' : 'No achievements yet',
            message: _total > 0
                ? 'The server returned $_total badges but the app could not display them. Pull to refresh or try again.'
                : 'Achievements will appear here once the catalog is available.',
            actionLabel: _total > 0 ? 'Try again' : null,
            onAction: _total > 0 ? _load : null,
          )
        else ...[
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: _SummaryStrip(
                  unlockedCount: _unlockedCount,
                  total: _total,
                  totalPoints: _totalPoints,
                  colors: colors,
                ),
              ),
              const SizedBox(width: 8),
              ProfileSortSelect(
                value: _filter,
                options: kAchievementFilterOptions,
                minWidth: 100,
                onChanged: (value) {
                  if (value == _filter) return;
                  setState(() => _filter = value);
                },
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (filtered.isEmpty)
            ProfileActivityEmpty(
              icon: Icons.filter_alt_off_outlined,
              title: _emptyFilterTitle,
              message: _emptyFilterMessage,
              actionLabel: 'Show all',
              onAction: () => setState(() => _filter = 'all'),
            )
          else
            _AchievementGrid(items: filtered),
        ],
      ],
    );
  }

  String get _emptyFilterTitle {
    return switch (_filter) {
      'completed' => 'No completed badges',
      'locked' => 'No locked badges',
      'unlocked' => 'No unlocked badges',
      _ => 'No matching badges',
    };
  }

  String get _emptyFilterMessage {
    return switch (_filter) {
      'completed' =>
        'Keep reading, writing, and engaging — your first completed badge will show up here.',
      'locked' => 'Switch to All to see every badge in the catalog.',
      'unlocked' => 'Switch to All to see completed or locked badges.',
      _ => 'Try a different filter or show all badges.',
    };
  }
}

class _AchievementGrid extends StatelessWidget {
  const _AchievementGrid({required this.items});

  final List<AchievementProgressItem> items;

  static const _spacing = 12.0;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final cellWidth = (constraints.maxWidth - _spacing) / 2;
        final rows = <Widget>[];

        for (var i = 0; i < items.length; i += 2) {
          final isFirstRow = i == 0;
          rows.add(
            Padding(
              padding: EdgeInsets.only(top: isFirstRow ? 0 : _spacing),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: cellWidth,
                    height: cellWidth,
                    child: AchievementCard(item: items[i]),
                  ),
                  const SizedBox(width: _spacing),
                  if (i + 1 < items.length)
                    SizedBox(
                      width: cellWidth,
                      height: cellWidth,
                      child: AchievementCard(item: items[i + 1]),
                    )
                  else
                    SizedBox(width: cellWidth, height: cellWidth),
                ],
              ),
            ),
          );
        }

        return Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: rows,
        );
      },
    );
  }
}

class _SummaryStrip extends StatelessWidget {
  const _SummaryStrip({
    required this.unlockedCount,
    required this.total,
    required this.totalPoints,
    required this.colors,
  });

  final int unlockedCount;
  final int total;
  final int totalPoints;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final completion = total > 0 ? ((unlockedCount / total) * 100).round() : 0;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: colors.card,
        border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 2),
        boxShadow: [
          BoxShadow(color: colors.shadow.withValues(alpha: 0.1), offset: const Offset(2, 2)),
        ],
      ),
      child: Row(
        children: [
          Icon(Icons.emoji_events_outlined, size: 16, color: colors.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$unlockedCount / $total UNLOCKED',
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.2,
                    color: colors.foreground,
                  ),
                ),
                Text(
                  '$completion% complete · $totalPoints pts',
                  style: GoogleFonts.inter(
                    fontSize: 9,
                    fontWeight: FontWeight.w600,
                    color: colors.mutedForeground,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
