import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/follow_user.dart';
import '../services/follow_api.dart';
import '../theme/app_color_tokens.dart';
import '../utils/resolve_profile_media_url.dart';
import '../widgets/ui/unfocus_tap_region.dart';

/// Followers or following list with local search — mirrors webapp dialog behavior.
class FollowListScreen extends StatefulWidget {
  const FollowListScreen({
    super.key,
    required this.username,
    required this.kind,
    this.totalCount = 0,
  });

  final String username;
  final FollowListKind kind;
  final int totalCount;

  @override
  State<FollowListScreen> createState() => _FollowListScreenState();
}

class _FollowListScreenState extends State<FollowListScreen> {
  final _api = FollowApi();
  final _searchController = TextEditingController();

  List<FollowUser> _users = [];
  String? _nextCursor;
  bool _loading = true;
  bool _loadingMore = false;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      setState(() => _search = _searchController.text);
    });
    _loadInitial();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadInitial() async {
    setState(() {
      _loading = true;
      _users = [];
      _nextCursor = null;
    });
    final page = await _fetchPage();
    if (!mounted) return;
    setState(() {
      _users = page.list;
      _nextCursor = page.nextCursor;
      _loading = false;
    });
  }

  Future<FollowListPage> _fetchPage({String? cursor}) {
    return widget.kind == FollowListKind.followers
        ? _api.getFollowers(widget.username, cursor: cursor)
        : _api.getFollowing(widget.username, cursor: cursor);
  }

  Future<void> _loadMore() async {
    if (_loadingMore || _nextCursor == null) return;
    setState(() => _loadingMore = true);
    final page = await _fetchPage(cursor: _nextCursor);
    if (!mounted) return;
    setState(() {
      _users = [..._users, ...page.list];
      _nextCursor = page.nextCursor;
      _loadingMore = false;
    });
  }

  List<FollowUser> get _filtered {
    final q = _search.trim().toLowerCase();
    if (q.isEmpty) return _users;
    return _users.where((u) {
      return u.fullName.toLowerCase().contains(q) || u.username.toLowerCase().contains(q);
    }).toList();
  }

  String get _title {
    return widget.kind == FollowListKind.followers ? 'Followers' : 'Following';
  }

  String get _searchHint {
    return widget.kind == FollowListKind.followers ? 'Search followers...' : 'Search following...';
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;
    final hasSearch = _search.trim().isNotEmpty;
    final countLabel = widget.totalCount > 0 ? ' (${widget.totalCount})' : '';

    return Scaffold(
      backgroundColor: context.appColors.background,
      appBar: AppBar(
        backgroundColor: context.appColors.background,
        foregroundColor: context.appColors.foreground,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Text(
          '$_title$countLabel'.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
          ),
        ),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: UnfocusTapRegion(
              child: TextField(
                controller: _searchController,
                textInputAction: TextInputAction.search,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                  color: context.appColors.foreground,
                ),
                decoration: InputDecoration(
                  hintText: _searchHint.toUpperCase(),
                  hintStyle: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.2,
                    color: context.appColors.mutedForeground,
                  ),
                  prefixIcon: Icon(Icons.search_rounded, color: context.appColors.mutedForeground, size: 20),
                  filled: true,
                  fillColor: context.appColors.inputFill,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
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
            ),
          ),
          Expanded(
            child: _loading
                ? Center(child: CircularProgressIndicator(color: context.appColors.primary))
                : filtered.isEmpty
                    ? _EmptyState(kind: widget.kind, hasSearch: hasSearch)
                    : RefreshIndicator(
                        color: context.appColors.primary,
                        backgroundColor: context.appColors.card,
                        onRefresh: _loadInitial,
                        child: ListView.separated(
                          physics: const AlwaysScrollableScrollPhysics(
                            parent: BouncingScrollPhysics(),
                          ),
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                          itemCount: filtered.length + (_showLoadMore ? 1 : 0),
                          separatorBuilder: (context, index) => const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            if (_showLoadMore && index == filtered.length) {
                              return _LoadMoreButton(
                                loading: _loadingMore,
                                onTap: _loadMore,
                              );
                            }
                            return _FollowUserRow(user: filtered[index]);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  bool get _showLoadMore => _search.trim().isEmpty && _nextCursor != null;
}

class _FollowUserRow extends StatelessWidget {
  const _FollowUserRow({required this.user});

  final FollowUser user;

  @override
  Widget build(BuildContext context) {
    final img = resolveProfileMediaUrl(user.profileImg);
    final displayName = user.fullName.trim().isNotEmpty ? user.fullName : user.username;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: context.appColors.muted.withValues(alpha: 0.06),
        border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
            ),
            clipBehavior: Clip.hardEdge,
            child: img.isNotEmpty
                ? Image.network(img, fit: BoxFit.cover, errorBuilder: (context, error, stackTrace) => _avatarFallback())
                : _avatarFallback(),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  displayName.toUpperCase(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.6,
                    color: context.appColors.foreground,
                  ),
                ),
                Text(
                  '@${user.username}'.toUpperCase(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.8,
                    color: context.appColors.mutedForeground,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _avatarFallback() {
    final seed = user.username.isNotEmpty ? user.username : '?';
    return Image.network(
      'https://api.dicebear.com/7.x/avataaars/svg?seed=$seed',
      fit: BoxFit.cover,
      errorBuilder: (context, error, stackTrace) => ColoredBox(
        color: context.appColors.muted.withValues(alpha: 0.35),
        child: Center(
          child: Text(
            seed.isNotEmpty ? seed.substring(0, 1).toUpperCase() : '?',
            style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: context.appColors.foreground),
          ),
        ),
      ),
    );
  }
}

class _LoadMoreButton extends StatelessWidget {
  const _LoadMoreButton({required this.loading, required this.onTap});

  final bool loading;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: OutlinedButton(
        onPressed: loading ? null : onTap,
        style: OutlinedButton.styleFrom(
          foregroundColor: context.appColors.foreground,
          side: BorderSide(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
          padding: const EdgeInsets.symmetric(vertical: 12),
          shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        ),
        child: Text(
          loading ? 'LOADING…' : 'LOAD MORE',
          style: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.4,
          ),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.kind, required this.hasSearch});

  final FollowListKind kind;
  final bool hasSearch;

  @override
  Widget build(BuildContext context) {
    if (hasSearch) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.search_off_rounded, size: 48, color: context.appColors.mutedForeground.withValues(alpha: 0.6)),
              const SizedBox(height: 12),
              Text(
                'NO MATCHES',
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                  color: context.appColors.mutedForeground,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Try a different search.',
                style: GoogleFonts.inter(fontSize: 12, color: context.appColors.mutedForeground),
              ),
            ],
          ),
        ),
      );
    }

    final isFollowers = kind == FollowListKind.followers;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: context.appColors.muted.withValues(alpha: 0.2),
                border: Border.all(
                  color: context.appColors.mutedForeground.withValues(alpha: 0.3),
                  width: 2,
                ),
              ),
              child: Icon(
                isFollowers ? Icons.person_add_outlined : Icons.explore_outlined,
                size: 32,
                color: context.appColors.mutedForeground.withValues(alpha: 0.5),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              isFollowers ? 'NO FOLLOWERS YET' : 'NOT FOLLOWING ANYONE YET',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.2,
                color: context.appColors.foreground,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              isFollowers
                  ? 'Share your profile — your audience is waiting.'
                  : 'Discover builders and hit Follow.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 12, color: context.appColors.mutedForeground),
            ),
          ],
        ),
      ),
    );
  }
}
