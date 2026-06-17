import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/blog_taxonomy.dart';
import '../../screens/topics/my_followed_categories_screen.dart';
import '../../services/blog_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../ui/app_tappable.dart';

const kProfileCategoryLogoSize = 48.0;

List<BlogTaxonomyRow> resolveFollowedCategories(
  List<String> slugs,
  List<BlogTaxonomyRow> catalog,
) {
  final bySlug = {
    for (final row in catalog) row.slug.toLowerCase(): row,
  };
  return slugs
      .map(
        (slug) => bySlug[slug.toLowerCase()] ??
            BlogTaxonomyRow(slug: slug, name: slug),
      )
      .toList();
}

/// Followed categories entry on the account profile — opens [MyFollowedCategoriesScreen].
class ProfileFollowedCategoriesStack extends StatefulWidget {
  const ProfileFollowedCategoriesStack({
    super.key,
    this.embedded = false,
  });

  final bool embedded;

  @override
  State<ProfileFollowedCategoriesStack> createState() =>
      ProfileFollowedCategoriesStackState();
}

class ProfileFollowedCategoriesStackState extends State<ProfileFollowedCategoriesStack> {
  final _api = BlogApi();

  List<BlogTaxonomyRow> _categories = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => reload());
  }

  Future<void> reload() => _load();

  Future<void> _load() async {
    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      if (mounted) {
        setState(() {
          _categories = const [];
          _loading = false;
        });
      }
      return;
    }

    setState(() => _loading = true);
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
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _categories = const [];
        _loading = false;
      });
    }
  }

  void _openMyCategories() {
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => const MyFollowedCategoriesScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading || _categories.isEmpty) return const SizedBox.shrink();

    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;

    return AppTappable(
      onTap: _openMyCategories,
      canRequestFocus: false,
      color: primary,
      splashColor: appRippleOnPrimary(colors),
      decoration: BoxDecoration(
        color: primary,
        border: Border.all(color: primary, width: 2),
        boxShadow: [
          BoxShadow(
            color: colors.shadow.withValues(alpha: 0.1),
            offset: const Offset(2, 2),
            blurRadius: 0,
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.layers_outlined, size: 16, color: colors.primaryForeground),
          const SizedBox(width: 6),
          Text(
            'FOLLOWED CATEGORIES',
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.6,
              color: colors.primaryForeground,
            ),
          ),
        ],
      ),
    );
  }
}

class ProfileCategoryLogo extends StatelessWidget {
  const ProfileCategoryLogo({
    super.key,
    required this.category,
    required this.size,
  });

  final BlogTaxonomyRow category;
  final double size;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;

    return Semantics(
      label: category.name,
      child: Icon(Icons.layers_outlined, size: size * 0.5, color: primary),
    );
  }
}
