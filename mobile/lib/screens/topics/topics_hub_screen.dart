import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/blog_taxonomy.dart';
import '../../services/blog_api.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/taxonomy_navigation.dart';
import '../../widgets/navigation/screen_app_bar.dart';
import '../../widgets/ui/app_loading_indicator.dart';
import '../../widgets/ui/app_pull_to_refresh.dart';

/// Topics hub — browse categories and tags (mirrors web `/topics`).
class TopicsHubScreen extends StatefulWidget {
  const TopicsHubScreen({super.key});

  static void open(BuildContext context) {
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => const TopicsHubScreen()),
    );
  }

  @override
  State<TopicsHubScreen> createState() => _TopicsHubScreenState();
}

class _TopicsHubScreenState extends State<TopicsHubScreen> {
  final _api = BlogApi();

  List<BlogTaxonomyRow> _categories = const [];
  BlogTagsExplore? _tagsExplore;
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
    try {
      final results = await Future.wait([
        _api.fetchCategoriesPage(limit: 48, sort: 'posts-desc'),
        _api.fetchTagsExplore(),
      ]);
      if (!mounted) return;
      final categoriesPage = results[0] as BlogTaxonomyPage;
      final tagsExplore = results[1] as BlogTagsExplore;
      setState(() {
        _categories = categoriesPage.list.where((c) => c.postCount > 0).toList();
        _tagsExplore = tagsExplore;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load topics.';
        _loading = false;
      });
    }
  }

  void _openCategory(BlogTaxonomyRow category) => openCategoryFeed(context, category);

  void _openTag(BlogTaxonomyRow tag) => openTagFeed(context, tag);

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: colors.background,
      appBar: const ScreenAppBar(title: 'Topics'),
      body: AppPullToRefresh(
        onRefresh: _load,
        child: _loading
            ? const AppLoadingCenter()
            : _error != null
                ? ListView(
                    physics: AppPullToRefresh.scrollPhysics,
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(32),
                        child: Column(
                          children: [
                            Text(_error!, style: TextStyle(color: colors.mutedForeground)),
                            TextButton(onPressed: _load, child: const Text('Try again')),
                          ],
                        ),
                      ),
                    ],
                  )
                : ListView(
                    physics: AppPullToRefresh.scrollPhysics,
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                    children: [
                      Text(
                        'Browse stories by category and tag.',
                        style: GoogleFonts.inter(fontSize: 13, color: colors.mutedForeground),
                      ),
                      const SizedBox(height: 20),
                      _SectionTitle(label: 'Categories', icon: Icons.layers_outlined),
                      const SizedBox(height: 10),
                      if (_categories.isEmpty)
                        Text('No categories yet.', style: TextStyle(color: colors.mutedForeground))
                      else
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final category in _categories)
                              _TopicChip(
                                label: category.name,
                                count: category.postCount,
                                onTap: () => _openCategory(category),
                                primary: primary,
                                colors: colors,
                              ),
                          ],
                        ),
                      const SizedBox(height: 24),
                      if (_tagsExplore != null) ...[
                        _SectionTitle(label: 'Trending tags', icon: Icons.local_fire_department_outlined),
                        const SizedBox(height: 10),
                        _TagWrap(
                          tags: _tagsExplore!.trending,
                          onTap: _openTag,
                          primary: primary,
                          colors: colors,
                        ),
                        const SizedBox(height: 20),
                        _SectionTitle(label: 'Popular tags', icon: Icons.tag_outlined),
                        const SizedBox(height: 10),
                        _TagWrap(
                          tags: _tagsExplore!.popular,
                          onTap: _openTag,
                          primary: primary,
                          colors: colors,
                        ),
                        const SizedBox(height: 20),
                        _SectionTitle(label: 'Recent tags', icon: Icons.schedule_outlined),
                        const SizedBox(height: 10),
                        _TagWrap(
                          tags: _tagsExplore!.recent,
                          onTap: _openTag,
                          primary: primary,
                          colors: colors,
                        ),
                      ],
                    ],
                  ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.label, required this.icon});

  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Row(
      children: [
        Icon(icon, size: 16, color: colors.foreground),
        const SizedBox(width: 8),
        Text(
          label.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w900,
            letterSpacing: 1,
            color: colors.foreground,
          ),
        ),
      ],
    );
  }
}

class _TagWrap extends StatelessWidget {
  const _TagWrap({
    required this.tags,
    required this.onTap,
    required this.primary,
    required this.colors,
  });

  final List<BlogTaxonomyRow> tags;
  final void Function(BlogTaxonomyRow tag) onTap;
  final Color primary;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    if (tags.isEmpty) {
      return Text('None yet.', style: TextStyle(color: colors.mutedForeground));
    }
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final tag in tags)
          _TopicChip(
            label: '#${tag.name.isNotEmpty ? tag.name : tag.slug}',
            count: tag.postCount,
            onTap: () => onTap(tag),
            primary: primary,
            colors: colors,
            isTag: true,
          ),
      ],
    );
  }
}

class _TopicChip extends StatelessWidget {
  const _TopicChip({
    required this.label,
    required this.count,
    required this.onTap,
    required this.primary,
    required this.colors,
    this.isTag = false,
  });

  final String label;
  final int count;
  final VoidCallback onTap;
  final Color primary;
  final AppColorTokens colors;
  final bool isTag;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isTag ? colors.card : primary.withValues(alpha: 0.1),
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            border: Border.all(color: isTag ? colors.border : primary, width: 2),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label.toUpperCase(),
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                  color: isTag ? colors.foreground : primary,
                ),
              ),
              if (count > 0) ...[
                const SizedBox(width: 6),
                Text(
                  '$count',
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    color: colors.mutedForeground,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
