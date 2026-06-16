import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/blog_taxonomy.dart';
import '../../services/api_errors.dart';
import '../../utils/taxonomy_navigation.dart';
import '../../services/auth_api.dart';
import '../../services/blog_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../widgets/auth/auth_button.dart';
import '../../widgets/navigation/screen_app_bar.dart';
import '../../widgets/profile/profile_activity_shared.dart';
import '../../widgets/profile/profile_followed_categories_stack.dart';
import '../../widgets/ui/app_feedback_toast.dart';
import '../../widgets/ui/app_pull_to_refresh.dart';

List<BlogTaxonomyRow> _sortCategories(List<BlogTaxonomyRow> categories, String sort) {
  final rows = [...categories];
  rows.sort((a, b) {
    final byName = a.name.toLowerCase().compareTo(b.name.toLowerCase());
    return sort == 'oldest' ? byName : -byName;
  });
  return rows;
}

class MyFollowedCategoriesScreen extends StatefulWidget {
  const MyFollowedCategoriesScreen({super.key});

  @override
  State<MyFollowedCategoriesScreen> createState() => _MyFollowedCategoriesScreenState();
}

class _MyFollowedCategoriesScreenState extends State<MyFollowedCategoriesScreen> {
  final _api = BlogApi();

  List<BlogTaxonomyRow> _categories = const [];
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
        _categories = const [];
        _loading = false;
        _error = 'Sign in to view followed categories.';
      });
      return;
    }

    try {
      final results = await Future.wait([
        _api.listFollowedCategories(accessToken: token),
        _api.fetchTaxonomy(),
      ]);
      if (!mounted) return;
      final slugs = results[0] as List<String>;
      final taxonomy = results[1] as BlogTaxonomyCatalog;
      setState(() {
        _categories = resolveFollowedCategories(slugs, taxonomy.categories);
        _loading = false;
      });
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _categories = const [];
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load followed categories.';
        _categories = const [];
        _loading = false;
      });
    }
  }

  Future<void> _onToggleFollow(BlogTaxonomyRow category) async {
    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      AppFeedbackToast.warning(context, 'Sign in to manage categories.');
      return;
    }

    setState(() => _toggleBusySlug = category.slug);
    try {
      await _api.unfollowCategory(slug: category.slug, accessToken: token);
      if (!mounted) return;
      setState(
        () => _categories = _categories.where((c) => c.slug != category.slug).toList(),
      );
      AppFeedbackToast.success(context, 'Unfollowed ${category.name}');
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

  void _onCategoryTap(BlogTaxonomyRow category) => openCategoryFeed(context, category);

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;
    final sortedCategories = _sortCategories(_categories, _sort);

    return Scaffold(
      backgroundColor: colors.background,
      appBar: const ScreenAppBar(title: 'My Categories'),
      body: AppPullToRefresh(
        onRefresh: _load,
        child: _buildBody(colors, primary, sortedCategories),
      ),
    );
  }

  Widget _buildBody(
    AppColorTokens colors,
    Color primary,
    List<BlogTaxonomyRow> sortedCategories,
  ) {
    final countLabel =
        '${sortedCategories.length} ${sortedCategories.length == 1 ? 'category' : 'categories'}';

    if (_loading) {
      return ListView(
        physics: AppPullToRefresh.scrollPhysics,
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        children: [
          _MyCategoriesToolbarCard(
            count: 0,
            countLabel: '0 categories',
            sortValue: _sort,
            onSortChanged: (value) => setState(() => _sort = value),
            primary: primary,
            colors: colors,
          ),
          const SizedBox(height: 16),
          const _MyCategoryRowSkeleton(),
          const SizedBox(height: 12),
          const _MyCategoryRowSkeleton(),
          const SizedBox(height: 12),
          const _MyCategoryRowSkeleton(),
        ],
      );
    }

    if (_error != null) {
      return ListView(
        physics: AppPullToRefresh.scrollPhysics,
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        children: [
          _MyCategoriesToolbarCard(
            count: 0,
            countLabel: '0 categories',
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

    if (_categories.isEmpty) {
      return ListView(
        physics: AppPullToRefresh.scrollPhysics,
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        children: [
          _MyCategoriesToolbarCard(
            count: 0,
            countLabel: countLabel,
            sortValue: _sort,
            onSortChanged: (value) => setState(() => _sort = value),
            primary: primary,
            colors: colors,
          ),
          const SizedBox(height: 24),
          const ProfileActivityEmpty(
            icon: Icons.layers_outlined,
            title: 'No categories followed',
            message: 'Follow categories from Topics to see them here.',
          ),
        ],
      );
    }

    return ListView.separated(
      physics: AppPullToRefresh.scrollPhysics,
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      itemCount: sortedCategories.length + 1,
      separatorBuilder: (context, index) => SizedBox(height: index == 0 ? 16 : 0),
      itemBuilder: (context, index) {
        if (index == 0) {
          return _MyCategoriesToolbarCard(
            count: sortedCategories.length,
            countLabel: countLabel,
            sortValue: _sort,
            onSortChanged: (value) => setState(() => _sort = value),
            primary: primary,
            colors: colors,
          );
        }

        final category = sortedCategories[index - 1];
        return _MyCategoryRow(
          category: category,
          busy: _toggleBusySlug == category.slug,
          onTap: () => _onCategoryTap(category),
          onToggleFollow: () => _onToggleFollow(category),
        );
      },
    );
  }
}

class _MyCategoriesToolbarCard extends StatelessWidget {
  const _MyCategoriesToolbarCard({
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
                  'TOTAL CATEGORIES',
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

class _MyCategoryRow extends StatelessWidget {
  const _MyCategoryRow({
    required this.category,
    required this.onTap,
    required this.onToggleFollow,
    this.busy = false,
  });

  final BlogTaxonomyRow category;
  final VoidCallback onTap;
  final VoidCallback onToggleFollow;
  final bool busy;

  String _description(BlogTaxonomyRow category) {
    final count = category.postCount;
    if (count <= 0) return 'No posts yet';
    return count == 1 ? '1 post' : '$count posts';
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Material(
      color: colors.background,
      child: InkWell(
        canRequestFocus: false,
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(color: colors.foreground.withValues(alpha: 0.12), width: 1),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              ProfileCategoryLogo(
                category: category,
                size: 48,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      category.name.toUpperCase(),
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
                      _description(category),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: colors.mutedForeground.withValues(alpha: 0.9),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              AuthButton(
                label: 'Unfollow',
                loadingLabel: 'Leaving…',
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

class _MyCategoryRowSkeleton extends StatelessWidget {
  const _MyCategoryRowSkeleton();

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
