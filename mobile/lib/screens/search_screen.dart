import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/blog_taxonomy.dart';
import '../models/recent_search_item.dart';
import '../models/search_hit.dart';
import '../screens/topics/topics_hub_screen.dart';
import '../services/blog_api.dart';
import '../services/recent_search_storage.dart';
import '../services/search_api.dart';
import '../theme/app_color_tokens.dart';
import '../utils/resolve_profile_media_url.dart';
import '../utils/search_query.dart';
import '../widgets/home/home_hero_chips_bar.dart';
import '../utils/blog_navigation.dart';
import '../utils/profile_navigation.dart';
import '../utils/squad_navigation.dart';
import '../utils/taxonomy_navigation.dart';
import '../widgets/navigation/screen_app_bar.dart';
import '../widgets/ui/app_loading_indicator.dart';
import '../widgets/ui/app_feedback_toast.dart';
import '../widgets/ui/unfocus_tap_region.dart';

/// Full-screen unified search — users, tags, categories, squads, posts (no features).
class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _api = SearchApi();
  final _blogApi = BlogApi();
  final _recentStorage = RecentSearchStorage();
  final _controller = TextEditingController();
  final _focusNode = FocusNode();

  Timer? _debounce;
  int _requestId = 0;

  UnifiedSearchResult? _result;
  bool _loading = false;
  String _query = '';

  List<RecentSearchItem> _recent = const [];
  List<BlogTaxonomyRow> _topCategories = const [];
  List<BlogTaxonomyRow> _topTags = const [];
  bool _discoverLoading = true;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onQueryChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _focusNode.requestFocus();
      _loadDiscover();
      _loadRecent();
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _loadRecent() async {
    final items = await _recentStorage.readAll();
    if (!mounted) return;
    setState(() => _recent = items);
  }

  Future<void> _loadDiscover() async {
    setState(() => _discoverLoading = true);
    try {
      final results = await Future.wait([
        _blogApi.fetchCategoriesPage(limit: 8, sort: 'posts-desc'),
        _blogApi.fetchTagsExplore(),
      ]);
      if (!mounted) return;
      final categoriesPage = results[0] as BlogTaxonomyPage;
      final tagsExplore = results[1] as BlogTagsExplore;
      setState(() {
        _topCategories = categoriesPage.list
            .where((c) => c.postCount > 0)
            .toList();
        _topTags = mergeHomeHotTags(tagsExplore, limit: 12);
        _discoverLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _discoverLoading = false);
    }
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
    _debounce = Timer(
      const Duration(milliseconds: searchDebounceMs),
      _runSearch,
    );
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
    await _recentStorage.addQuery(q);
    await _loadRecent();
    if (!mounted) return;
    setState(() {
      _result = result;
      _loading = false;
    });
  }

  void _applyRecentQuery(String query) {
    _controller.text = query;
    _controller.selection = TextSelection.collapsed(offset: query.length);
    _focusNode.requestFocus();
  }

  Future<void> _clearRecent() async {
    await _recentStorage.clearAll();
    await _loadRecent();
  }

  Future<void> _onHitTap(SearchHit hit) async {
    final activeQuery = normalizeSearchQuery(_query);
    await _recentStorage.addHit(
      hit,
      replaceQuery: activeQuery.isNotEmpty ? activeQuery : null,
    );
    await _loadRecent();
    if (!mounted) return;

    switch (hit.type) {
      case SearchEntityType.squad:
        final slug = squadSlugFromSearchHref(hit.href) ?? hit.id;
        if (slug.isNotEmpty) {
          await openSquadDetail(context, slug: slug);
        }
        return;
      case SearchEntityType.category:
        await openCategoryFeed(context, categoryRowFromSearchHit(hit));
        return;
      case SearchEntityType.tag:
        await openTagFeed(context, tagRowFromSearchHit(hit));
        return;
      case SearchEntityType.blog:
        await openBlogFromSearchHit(context, hit);
        return;
      case SearchEntityType.user:
        await openUserFromSearchHit(context, hit);
        return;
      case SearchEntityType.feature:
        AppFeedbackToast.warning(
          context,
          'Opening ${hit.displayLabel} — coming soon on mobile.',
        );
    }
  }

  void _openCategory(BlogTaxonomyRow category) =>
      openCategoryFeed(context, category);

  void _openTag(BlogTaxonomyRow tag) => openTagFeed(context, tag);

  void _openAllCategories() => TopicsHubScreen.open(context);

  @override
  Widget build(BuildContext context) {
    final trimmed = normalizeSearchQuery(_query);
    final queryReady = isSearchQueryReady(_query);
    final sections = _result?.groupedEntries ?? [];

    return Scaffold(
      backgroundColor: context.appColors.background,
      appBar: const ScreenAppBar(title: 'Search'),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _SearchField(
            controller: _controller,
            focusNode: _focusNode,
            loading: _loading && queryReady,
            onSubmitted: _runSearch,
          ),
          Expanded(
            child: _buildBody(
              trimmed: trimmed,
              queryReady: queryReady,
              sections: sections,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBody({
    required String trimmed,
    required bool queryReady,
    required List<(SearchGroupKey, List<SearchHit>)> sections,
  }) {
    if (trimmed.isEmpty || !queryReady) {
      return _SearchDiscoverState(
        recent: _recent,
        topCategories: _topCategories,
        topTags: _topTags,
        loading: _discoverLoading,
        onRecentQuery: _applyRecentQuery,
        onRecentHit: _onHitTap,
        onClearRecent: _clearRecent,
        onCategory: _openCategory,
        onTag: _openTag,
        onViewAllCategories: _openAllCategories,
      );
    }

    if (_loading && sections.isEmpty) {
      return const AppLoadingCenter();
    }

    if (!_loading && sections.isEmpty) {
      return _SearchNoMatches(query: _query);
    }

    return ListView(
      padding: const EdgeInsets.only(bottom: 16),
      children: [
        for (final (groupKey, hits) in sections) ...[
          _SearchGroupHeader(
            label: searchGroupLabels[groupKey] ?? groupKey.name,
          ),
          ...hits.map(
            (hit) => _SearchHitTile(hit: hit, onTap: () => _onHitTap(hit)),
          ),
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
    required this.onSubmitted,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final bool loading;
  final VoidCallback onSubmitted;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.appColors.muted.withValues(alpha: 0.35),
        border: Border(
          bottom: BorderSide(
            color: context.appColors.border.withValues(alpha: 0.85),
            width: 2,
          ),
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
                onSubmitted: (_) => onSubmitted(),
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
                    color: context.appColors.mutedForeground.withValues(
                      alpha: 0.45,
                    ),
                  ),
                ),
              ),
            ),
          ),
          if (controller.text.isNotEmpty)
            IconButton(
              tooltip: 'Clear',
              onPressed: loading
                  ? null
                  : () {
                      controller.clear();
                      focusNode.requestFocus();
                    },
              icon: Icon(
                Icons.close_rounded,
                size: 20,
                color: loading
                    ? context.appColors.mutedForeground.withValues(alpha: 0.35)
                    : context.appColors.mutedForeground,
              ),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            ),
        ],
      ),
    );
  }
}

class _SearchDiscoverState extends StatelessWidget {
  const _SearchDiscoverState({
    required this.recent,
    required this.topCategories,
    required this.topTags,
    required this.loading,
    required this.onRecentQuery,
    required this.onRecentHit,
    required this.onClearRecent,
    required this.onCategory,
    required this.onTag,
    required this.onViewAllCategories,
  });

  final List<RecentSearchItem> recent;
  final List<BlogTaxonomyRow> topCategories;
  final List<BlogTaxonomyRow> topTags;
  final bool loading;
  final ValueChanged<String> onRecentQuery;
  final ValueChanged<SearchHit> onRecentHit;
  final VoidCallback onClearRecent;
  final ValueChanged<BlogTaxonomyRow> onCategory;
  final ValueChanged<BlogTaxonomyRow> onTag;
  final VoidCallback onViewAllCategories;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final hasRecent = recent.isNotEmpty;
    final hasCategories = topCategories.isNotEmpty;
    final hasTags = topTags.isNotEmpty;

    if (!loading && !hasRecent && !hasCategories && !hasTags) {
      return const _SearchIdleHint();
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        if (hasRecent) ...[
          _DiscoverSectionHeader(
            label: 'Recent searches',
            leading: Icon(
              Icons.history_rounded,
              size: 16,
              color: colors.foreground,
            ),
            trailing: TextButton(
              onPressed: onClearRecent,
              style: TextButton.styleFrom(
                foregroundColor: colors.mutedForeground,
                padding: const EdgeInsets.symmetric(horizontal: 4),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text(
                'CLEAR',
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.8,
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          for (final item in recent)
            _RecentSearchTile(
              item: item,
              onQueryTap: onRecentQuery,
              onHitTap: onRecentHit,
            ),
          const SizedBox(height: 20),
        ],
        _DiscoverSectionHeader(
          label: 'Top categories',
          leading: Icon(
            Icons.layers_outlined,
            size: 16,
            color: colors.foreground,
          ),
        ),
        const SizedBox(height: 10),
        if (loading && !hasCategories)
          const _DiscoverChipSkeletonRow()
        else if (!hasCategories)
          Text(
            'No categories yet.',
            style: TextStyle(color: colors.mutedForeground, fontSize: 13),
          )
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final category in topCategories)
                _DiscoverChip(
                  label: category.name,
                  leading: Icon(
                    Icons.layers_outlined,
                    size: 14,
                    color: primary,
                  ),
                  onTap: () => onCategory(category),
                  primary: primary,
                  colors: colors,
                ),
            ],
          ),
        const SizedBox(height: 10),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton(
            onPressed: onViewAllCategories,
            style: TextButton.styleFrom(
              foregroundColor: primary,
              padding: const EdgeInsets.symmetric(horizontal: 4),
            ),
            child: Text(
              'VIEW ALL CATEGORIES',
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.8,
              ),
            ),
          ),
        ),
        const SizedBox(height: 20),
        _DiscoverSectionHeader(
          label: 'Top tags',
          leading: Text(
            '#',
            style: GoogleFonts.jetBrainsMono(
              fontSize: 15,
              fontWeight: FontWeight.w900,
              color: colors.foreground,
              height: 1,
            ),
          ),
        ),
        const SizedBox(height: 10),
        if (loading && !hasTags)
          const _DiscoverChipSkeletonRow()
        else if (!hasTags)
          Text(
            'No tags yet.',
            style: TextStyle(color: colors.mutedForeground, fontSize: 13),
          )
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final tag in topTags)
                _DiscoverChip(
                  label: tag.name.isNotEmpty ? tag.name : tag.slug,
                  leading: Text(
                    '#',
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      color: primary,
                      height: 1,
                    ),
                  ),
                  onTap: () => onTag(tag),
                  primary: primary,
                  colors: colors,
                  outlined: true,
                ),
            ],
          ),
      ],
    );
  }
}

class _SearchIdleHint extends StatelessWidget {
  const _SearchIdleHint();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.search_rounded,
              size: 48,
              color: context.appColors.mutedForeground.withValues(alpha: 0.25),
            ),
            const SizedBox(height: 16),
            Text(
              'SEARCH STORIES, TAGS, SQUADS, AND PEOPLE',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.2,
                color: context.appColors.mutedForeground.withValues(
                  alpha: 0.55,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DiscoverSectionHeader extends StatelessWidget {
  const _DiscoverSectionHeader({
    required this.label,
    this.leading,
    this.trailing,
  });

  final String label;
  final Widget? leading;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        if (leading != null) ...[leading!, const SizedBox(width: 8)],
        Expanded(
          child: Text(
            label.toUpperCase(),
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              letterSpacing: 1,
              color: context.appColors.foreground,
            ),
          ),
        ),
        ?trailing,
      ],
    );
  }
}

class _DiscoverChip extends StatelessWidget {
  const _DiscoverChip({
    required this.label,
    required this.onTap,
    required this.primary,
    required this.colors,
    this.leading,
    this.outlined = false,
  });

  final String label;
  final VoidCallback onTap;
  final Color primary;
  final AppColorTokens colors;
  final Widget? leading;
  final bool outlined;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: outlined ? colors.card : primary.withValues(alpha: 0.1),
      child: InkWell(
        canRequestFocus: false,
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            border: Border.all(
              color: outlined ? colors.border : primary,
              width: 2,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (leading != null) ...[leading!, const SizedBox(width: 6)],
              Text(
                label.toUpperCase(),
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                  color: outlined ? colors.foreground : primary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DiscoverChipSkeletonRow extends StatelessWidget {
  const _DiscoverChipSkeletonRow();

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (var i = 0; i < 4; i++)
          Container(
            width: 72 + (i * 18.0),
            height: 36,
            decoration: BoxDecoration(
              color: colors.muted.withValues(alpha: 0.28),
              border: Border.all(
                color: colors.border.withValues(alpha: 0.5),
                width: 2,
              ),
            ),
          ),
      ],
    );
  }
}

class _RecentSearchTile extends StatelessWidget {
  const _RecentSearchTile({
    required this.item,
    required this.onQueryTap,
    required this.onHitTap,
  });

  final RecentSearchItem item;
  final ValueChanged<String> onQueryTap;
  final ValueChanged<SearchHit> onHitTap;

  @override
  Widget build(BuildContext context) {
    return switch (item) {
      RecentSearchQuery(:final query) => _RecentQueryRow(
        query: query,
        onTap: () => onQueryTap(query),
      ),
      RecentSearchHitEntry(:final hit) => _RecentHitRow(
        hit: hit,
        onTap: () => onHitTap(hit),
      ),
    };
  }
}

class _RecentQueryRow extends StatelessWidget {
  const _RecentQueryRow({required this.query, required this.onTap});

  final String query;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: context.appColors.background,
      child: InkWell(
        canRequestFocus: false,
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: context.appColors.border.withValues(alpha: 0.2),
              ),
            ),
          ),
          child: Row(
            children: [
              Icon(
                Icons.search_rounded,
                size: 18,
                color: context.appColors.mutedForeground,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  query,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: context.appColors.foreground,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecentHitRow extends StatelessWidget {
  const _RecentHitRow({required this.hit, required this.onTap});

  final SearchHit hit;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    if (hit.type == SearchEntityType.tag ||
        hit.type == SearchEntityType.category) {
      return Material(
        color: context.appColors.background,
        child: InkWell(
          canRequestFocus: false,
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: context.appColors.border.withValues(alpha: 0.2),
                ),
              ),
            ),
            child: Row(
              children: [
                _SearchHitLeading(hit: hit),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    hit.displayLabel,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: context.appColors.foreground,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (hit.type == SearchEntityType.blog) {
      return Material(
        color: context.appColors.background,
        child: InkWell(
          canRequestFocus: false,
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: context.appColors.border.withValues(alpha: 0.2),
                ),
              ),
            ),
            child: Row(
              children: [
                _SearchHitLeading(hit: hit),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    hit.label,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: context.appColors.foreground,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (hit.type == SearchEntityType.user) {
      return Material(
        color: context.appColors.background,
        child: InkWell(
          canRequestFocus: false,
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: context.appColors.border.withValues(alpha: 0.2),
                ),
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
                        hit.label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: context.appColors.foreground,
                        ),
                      ),
                      if (hit.sublabel != null && hit.sublabel!.isNotEmpty)
                        Text(
                          hit.sublabel!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: context.appColors.mutedForeground,
                          ),
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

    return _SearchHitTile(hit: hit, onTap: onTap, compact: true);
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
            Icon(
              Icons.search_off_rounded,
              size: 48,
              color: context.appColors.mutedForeground.withValues(alpha: 0.25),
            ),
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
  const _SearchHitTile({
    required this.hit,
    required this.onTap,
    this.compact = false,
  });

  final SearchHit hit;
  final VoidCallback onTap;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final showSublabel =
        !compact && hit.sublabel != null && hit.sublabel!.isNotEmpty;

    return Material(
      color: context.appColors.background,
      child: InkWell(
        canRequestFocus: false,
        onTap: onTap,
        child: Container(
          padding: EdgeInsets.symmetric(
            horizontal: 16,
            vertical: compact ? 10 : 12,
          ),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: context.appColors.border.withValues(alpha: 0.2),
                width: 1,
              ),
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
                        fontSize: compact ? 12 : 13,
                        fontWeight: FontWeight.w900,
                        color: context.appColors.foreground,
                      ),
                    ),
                    if (showSublabel)
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
              if (!compact)
                Icon(
                  Icons.chevron_right_rounded,
                  color: context.appColors.mutedForeground.withValues(
                    alpha: 0.5,
                  ),
                ),
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
    final showAvatar =
        hit.type == SearchEntityType.user ||
        (hit.type == SearchEntityType.squad &&
            (hit.imageUrl?.isNotEmpty ?? false));

    if (showAvatar) {
      final img = resolveProfileMediaUrl(hit.imageUrl);
      final seed = hit.id.isNotEmpty ? hit.id : hit.label;
      return Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          border: Border.all(
            color: context.appColors.border.withValues(alpha: 0.85),
            width: 2,
          ),
          color: context.appColors.muted.withValues(alpha: 0.3),
        ),
        clipBehavior: Clip.hardEdge,
        child: img.isNotEmpty
            ? Image.network(
                img,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) =>
                    _fallbackAvatar(seed),
              )
            : _fallbackAvatar(seed),
      );
    }

    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        border: Border.all(
          color: context.appColors.border.withValues(alpha: 0.85),
          width: 2,
        ),
        color: context.appColors.muted.withValues(alpha: 0.25),
      ),
      child: Icon(
        _iconForType(hit.type),
        size: 18,
        color: context.appColors.primary,
      ),
    );
  }

  Widget _fallbackAvatar(String seed) {
    return Image.network(
      'https://api.dicebear.com/7.x/avataaars/svg?seed=${Uri.encodeComponent(seed)}',
      fit: BoxFit.cover,
      errorBuilder: (context, error, stackTrace) => Center(
        child: Icon(
          Icons.person_outline,
          size: 20,
          color: context.appColors.mutedForeground,
        ),
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
