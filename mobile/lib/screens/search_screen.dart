import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/search_hit.dart';
import '../services/search_api.dart';
import '../theme/app_color_tokens.dart';
import '../utils/resolve_profile_media_url.dart';
import '../utils/search_query.dart';
import '../widgets/ui/unfocus_tap_region.dart';

/// Full-screen unified search — users, tags, categories, squads, posts (no features).
class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _api = SearchApi();
  final _controller = TextEditingController();
  final _focusNode = FocusNode();

  Timer? _debounce;
  int _requestId = 0;

  UnifiedSearchResult? _result;
  bool _loading = false;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onQueryChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onQueryChanged() {
    setState(() => _query = _controller.text);
    _debounce?.cancel();

    final trimmed = normalizeSearchQuery(_query);
    if (trimmed.isEmpty) {
      setState(() {
        _result = null;
        _loading = false;
      });
      return;
    }

    if (!isSearchQueryReady(_query)) {
      setState(() {
        _result = null;
        _loading = false;
      });
      return;
    }

    setState(() => _loading = true);
    _debounce = Timer(const Duration(milliseconds: searchDebounceMs), _runSearch);
  }

  Future<void> _runSearch() async {
    final q = normalizeSearchQuery(_query);
    if (!isSearchQueryReady(q)) {
      if (mounted) setState(() => _loading = false);
      return;
    }

    final id = ++_requestId;
    final result = await _api.unified(q);
    if (!mounted || id != _requestId) return;
    setState(() {
      _result = result;
      _loading = false;
    });
  }

  void _onHitTap(SearchHit hit) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Opening ${hit.displayLabel} — coming soon on mobile.',
          style: GoogleFonts.inter(fontWeight: FontWeight.w600),
        ),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  String get _statusLabel {
    if (_loading) return 'Fetching data…';
    final trimmed = normalizeSearchQuery(_query);
    if (trimmed.isEmpty) return 'System ready';
    final chars = searchQueryCharCount(_query);
    if (chars < searchMinChars) return 'Min $searchMinChars chars';
    final count = _result?.matchCount ?? 0;
    if (count > 0) return 'Matches: $count';
    if (!_loading) return 'No matches';
    return 'System ready';
  }

  @override
  Widget build(BuildContext context) {
    final trimmed = normalizeSearchQuery(_query);
    final charCount = searchQueryCharCount(_query);
    final queryReady = isSearchQueryReady(_query);
    final sections = _result?.groupedEntries ?? [];

    return Scaffold(
      backgroundColor: context.appColors.background,
      appBar: AppBar(
        backgroundColor: context.appColors.background,
        foregroundColor: context.appColors.foreground,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Text(
          'SEARCH',
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
          _SearchField(
            controller: _controller,
            focusNode: _focusNode,
            loading: _loading && queryReady,
          ),
          Expanded(
            child: _buildBody(
              trimmed: trimmed,
              charCount: charCount,
              queryReady: queryReady,
              sections: sections,
            ),
          ),
          _SearchFooter(
            statusLabel: _statusLabel,
            tookMs: _result?.tookMs,
          ),
        ],
      ),
    );
  }

  Widget _buildBody({
    required String trimmed,
    required int charCount,
    required bool queryReady,
    required List<(SearchGroupKey, List<SearchHit>)> sections,
  }) {
    if (trimmed.isEmpty) {
      return const _SearchIdleState();
    }

    if (charCount < searchMinChars) {
      return _SearchMinCharsHint(remaining: searchMinChars - charCount);
    }

    if (_loading && sections.isEmpty) {
      return Center(child: CircularProgressIndicator(color: context.appColors.primary));
    }

    if (!_loading && sections.isEmpty) {
      return _SearchNoMatches(query: _query);
    }

    return ListView(
      padding: const EdgeInsets.only(bottom: 16),
      children: [
        for (final (groupKey, hits) in sections) ...[
          _SearchGroupHeader(label: searchGroupLabels[groupKey] ?? groupKey.name),
          ...hits.map((hit) => _SearchHitTile(hit: hit, onTap: () => _onHitTap(hit))),
        ],
      ],
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({
    required this.controller,
    required this.focusNode,
    required this.loading,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.appColors.muted.withValues(alpha: 0.35),
        border: Border(
          bottom: BorderSide(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
        ),
      ),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      child: Row(
        children: [
          Text(
            '>',
            style: GoogleFonts.jetBrainsMono(
              fontSize: 20,
              fontWeight: FontWeight.w900,
              color: context.appColors.primary,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: UnfocusTapRegion(
              child: TextField(
                controller: controller,
                focusNode: focusNode,
                textInputAction: TextInputAction.search,
                autocorrect: false,
                enableSuggestions: false,
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: context.appColors.foreground,
                ),
                decoration: InputDecoration(
                  isDense: true,
                  border: InputBorder.none,
                  hintText: 'Search people, posts, topics, squads…',
                  hintStyle: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: context.appColors.mutedForeground.withValues(alpha: 0.45),
                  ),
                ),
              ),
            ),
          ),
          if (loading)
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2.5, color: context.appColors.primary),
            )
          else if (controller.text.isNotEmpty)
            IconButton(
              tooltip: 'Clear',
              onPressed: () {
                controller.clear();
                focusNode.requestFocus();
              },
              icon: Icon(Icons.close_rounded, size: 20, color: context.appColors.mutedForeground),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            ),
        ],
      ),
    );
  }
}

class _SearchIdleState extends StatelessWidget {
  const _SearchIdleState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search_rounded, size: 48, color: context.appColors.mutedForeground.withValues(alpha: 0.25)),
            const SizedBox(height: 16),
            Text(
              'SEARCH STORIES, TAGS, SQUADS, AND PEOPLE',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.2,
                color: context.appColors.mutedForeground.withValues(alpha: 0.55),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Type at least $searchMinChars characters',
              style: GoogleFonts.inter(fontSize: 12, color: context.appColors.mutedForeground.withValues(alpha: 0.45)),
            ),
          ],
        ),
      ),
    );
  }
}

class _SearchMinCharsHint extends StatelessWidget {
  const _SearchMinCharsHint({required this.remaining});

  final int remaining;

  @override
  Widget build(BuildContext context) {
    final suffix = remaining == 1 ? '' : 's';
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Text(
          'Type $remaining more character$suffix to search',
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.8,
            color: context.appColors.mutedForeground,
          ),
        ),
      ),
    );
  }
}

class _SearchNoMatches extends StatelessWidget {
  const _SearchNoMatches({required this.query});

  final String query;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search_off_rounded, size: 48, color: context.appColors.mutedForeground.withValues(alpha: 0.25)),
            const SizedBox(height: 16),
            Text(
              'NO MATCHES FOR:',
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.2,
                color: context.appColors.mutedForeground,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              query,
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: context.appColors.foreground,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SearchGroupHeader extends StatelessWidget {
  const _SearchGroupHeader({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
      color: context.appColors.muted.withValues(alpha: 0.45),
      child: Text(
        label.toUpperCase(),
        style: GoogleFonts.jetBrainsMono(
          fontSize: 9,
          fontWeight: FontWeight.w900,
          letterSpacing: 1.6,
          color: context.appColors.mutedForeground,
        ),
      ),
    );
  }
}

class _SearchHitTile extends StatelessWidget {
  const _SearchHitTile({required this.hit, required this.onTap});

  final SearchHit hit;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: context.appColors.background,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(color: context.appColors.border.withValues(alpha: 0.2), width: 1),
            ),
          ),
          child: Row(
            children: [
              _SearchHitLeading(hit: hit),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      hit.displayLabel.toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.jetBrainsMono(
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                        color: context.appColors.foreground,
                      ),
                    ),
                    if (hit.sublabel != null && hit.sublabel!.isNotEmpty)
                      Text(
                        hit.sublabel!.toUpperCase(),
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
              Icon(Icons.chevron_right_rounded, color: context.appColors.mutedForeground.withValues(alpha: 0.5)),
            ],
          ),
        ),
      ),
    );
  }
}

class _SearchHitLeading extends StatelessWidget {
  const _SearchHitLeading({required this.hit});

  final SearchHit hit;

  @override
  Widget build(BuildContext context) {
    final showAvatar = hit.type == SearchEntityType.user ||
        (hit.type == SearchEntityType.squad && (hit.imageUrl?.isNotEmpty ?? false));

    if (showAvatar) {
      final img = resolveProfileMediaUrl(hit.imageUrl);
      final seed = hit.id.isNotEmpty ? hit.id : hit.label;
      return Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
          color: context.appColors.muted.withValues(alpha: 0.3),
        ),
        clipBehavior: Clip.hardEdge,
        child: img.isNotEmpty
            ? Image.network(img, fit: BoxFit.cover, errorBuilder: (context, error, stackTrace) => _fallbackAvatar(seed))
            : _fallbackAvatar(seed),
      );
    }

    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        border: Border.all(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
        color: context.appColors.muted.withValues(alpha: 0.25),
      ),
      child: Icon(_iconForType(hit.type), size: 18, color: context.appColors.primary),
    );
  }

  Widget _fallbackAvatar(String seed) {
    return Image.network(
      'https://api.dicebear.com/7.x/avataaars/svg?seed=${Uri.encodeComponent(seed)}',
      fit: BoxFit.cover,
      errorBuilder: (context, error, stackTrace) => Center(
        child: Icon(Icons.person_outline, size: 20, color: context.appColors.mutedForeground),
      ),
    );
  }

  IconData _iconForType(SearchEntityType type) {
    return switch (type) {
      SearchEntityType.user => Icons.person_outline,
      SearchEntityType.tag => Icons.tag_rounded,
      SearchEntityType.category => Icons.layers_outlined,
      SearchEntityType.squad => Icons.groups_outlined,
      SearchEntityType.blog => Icons.article_outlined,
      SearchEntityType.feature => Icons.grid_view_rounded,
    };
  }
}

class _SearchFooter extends StatelessWidget {
  const _SearchFooter({required this.statusLabel, this.tookMs});

  final String statusLabel;
  final int? tookMs;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: context.appColors.background,
        border: Border(
          top: BorderSide(color: context.appColors.border.withValues(alpha: 0.85), width: 2),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 6,
            height: 6,
            color: context.appColors.primary.withValues(alpha: 0.75),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              statusLabel.toUpperCase(),
              style: GoogleFonts.inter(
                fontSize: 9,
                fontWeight: FontWeight.w900,
                letterSpacing: 1,
                color: context.appColors.mutedForeground,
              ),
            ),
          ),
          if (tookMs != null)
            Text(
              '${tookMs}ms',
              style: GoogleFonts.inter(
                fontSize: 9,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.8,
                color: context.appColors.mutedForeground.withValues(alpha: 0.35),
              ),
            ),
        ],
      ),
    );
  }
}
