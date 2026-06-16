import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/blog_feed_post.dart';
import '../../models/category_members_snapshot.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/profile_navigation.dart';
import '../../utils/resolve_profile_media_url.dart';
import '../profile/profile_activity_shared.dart';
import '../profile/profile_followed_squads_stack.dart';

const kTaxonomyAvatarStackSize = 36.0;
const kTaxonomyAvatarStackLimit = 5;

List<CategoryMemberPreview> uniqueAuthorsFromPosts(
  List<BlogFeedPost> posts, {
  int limit = kTaxonomyAvatarStackLimit,
}) {
  final seen = <String>{};
  final out = <CategoryMemberPreview>[];
  for (final post in posts) {
    final username = post.author.username.trim();
    if (username.isEmpty) continue;
    final key = username.toLowerCase();
    if (seen.contains(key)) continue;
    seen.add(key);
    out.add(CategoryMemberPreview(username: username, profileImg: post.author.profileImg));
    if (out.length >= limit) break;
  }
  return out;
}

/// Left-aligned taxonomy hero — icon card, title, optional action, and meta row.
class TaxonomyFeedHeroHeader extends StatelessWidget {
  const TaxonomyFeedHeroHeader({
    super.key,
    required this.icon,
    required this.title,
    this.meta,
    this.headerAction,
  });

  final IconData icon;
  final String title;
  final Widget? meta;
  final Widget? headerAction;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final primary = Theme.of(context).colorScheme.primary;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: colors.card,
            border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 2),
            boxShadow: [
              BoxShadow(
                color: colors.shadow.withValues(alpha: 0.12),
                offset: const Offset(2, 2),
                blurRadius: 0,
              ),
            ],
          ),
          alignment: Alignment.center,
          child: Icon(icon, size: 22, color: primary),
        ),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                title.toUpperCase(),
                style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.6,
                  height: 1.15,
                  color: colors.foreground,
                ),
              ),
            ),
            if (headerAction != null) ...[
              const SizedBox(width: 12),
              headerAction!,
            ],
          ],
        ),
        if (meta != null) ...[
          const SizedBox(height: 10),
          meta!,
        ],
      ],
    );
  }
}

/// Overlapping member avatars + follower count (circle when ≤5, text when >5).
class TaxonomyMembersMetaRow extends StatelessWidget {
  const TaxonomyMembersMetaRow({
    super.key,
    required this.members,
    required this.totalCount,
    this.loading = false,
  });

  final List<CategoryMemberPreview> members;
  final int totalCount;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Row(
        children: [
          TaxonomyAvatarStackSkeleton(),
          SizedBox(width: 8),
          ProfileCountPillSkeleton(),
        ],
      );
    }

    final count = totalCount > 0 ? totalCount : members.length;
    final countLabel = '$count ${count == 1 ? 'member' : 'members'}';

    return Row(
      children: [
        if (members.isNotEmpty)
          TaxonomyAvatarStack(members: members, totalCount: count)
        else if (count > 0)
          TaxonomyMemberCountBadge(count: count, label: countLabel),
        if (members.isNotEmpty && count > 0) ...[
          const SizedBox(width: 8),
          TaxonomyMemberCountBadge(count: count, label: countLabel),
        ],
      ],
    );
  }
}

/// Member count — circular pill up to 5, plain label when more than 5 followers.
class TaxonomyMemberCountBadge extends StatelessWidget {
  const TaxonomyMemberCountBadge({
    super.key,
    required this.count,
    required this.label,
  });

  final int count;
  final String label;

  @override
  Widget build(BuildContext context) {
    if (count <= kTaxonomyAvatarStackLimit) {
      return ProfileCountPill(count: count, semanticLabel: label);
    }

    final primary = Theme.of(context).colorScheme.primary;
    return Semantics(
      label: label,
      child: Text(
        label.toUpperCase(),
        style: GoogleFonts.inter(
          fontSize: 10,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.6,
          color: primary,
        ),
      ),
    );
  }
}

/// Top author faces for tag lanes — same overlapping stack as squads on account.
class TaxonomyAuthorsMetaRow extends StatelessWidget {
  const TaxonomyAuthorsMetaRow({
    super.key,
    required this.authors,
    this.totalCount,
    this.loading = false,
  });

  final List<CategoryMemberPreview> authors;
  final int? totalCount;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const TaxonomyAvatarStackSkeleton();
    }
    if (authors.isEmpty) return const SizedBox.shrink();

    return TaxonomyAvatarStack(
      members: authors,
      totalCount: totalCount ?? authors.length,
      previewLimit: kTaxonomyAvatarStackLimit,
    );
  }
}

class TaxonomyAvatarStack extends StatelessWidget {
  const TaxonomyAvatarStack({
    super.key,
    required this.members,
    required this.totalCount,
    this.previewLimit = kTaxonomyAvatarStackLimit,
  });

  final List<CategoryMemberPreview> members;
  final int totalCount;
  final int previewLimit;

  @override
  Widget build(BuildContext context) {
    if (members.isEmpty) return const SizedBox.shrink();

    final colors = context.appColors;
    final visible = members.take(previewLimit).toList();
    final overflow = totalCount > visible.length ? totalCount - visible.length : 0;
    const iconSize = kTaxonomyAvatarStackSize;
    const step = iconSize / 2;
    final slotCount = visible.length + (overflow > 0 ? 1 : 0);
    final stackWidth = iconSize + (slotCount - 1) * step;

    return SizedBox(
      width: stackWidth,
      height: iconSize,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          for (var i = 0; i < visible.length; i++)
            Positioned(
              left: i * step,
              child: TaxonomyMemberAvatar(
                member: visible[i],
                size: iconSize,
                colors: colors,
              ),
            ),
          if (overflow > 0)
            Positioned(
              left: visible.length * step,
              child: ProfileStackOverflowBadge(
                count: overflow,
                size: iconSize,
                borderColor: profileSquadStackBorder(colors),
                colors: colors,
              ),
            ),
        ],
      ),
    );
  }
}

class TaxonomyMemberAvatar extends StatelessWidget {
  const TaxonomyMemberAvatar({
    super.key,
    required this.member,
    required this.size,
    required this.colors,
  });

  final CategoryMemberPreview member;
  final double size;
  final AppColorTokens colors;

  @override
  Widget build(BuildContext context) {
    final img = resolveProfileMediaUrl(member.profileImg);
    final letter = member.username.isNotEmpty ? member.username[0].toUpperCase() : '?';

    return Semantics(
      label: member.username,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => openPublicProfile(context, username: member.username),
          child: Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: colors.card,
              border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 2),
              boxShadow: [
                BoxShadow(
                  color: colors.shadow.withValues(alpha: 0.12),
                  offset: const Offset(1, 1),
                  blurRadius: 0,
                ),
              ],
            ),
            clipBehavior: Clip.hardEdge,
            child: img.isNotEmpty
                ? Image.network(
                    img,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => _LetterFallback(letter: letter, size: size),
                  )
                : _LetterFallback(letter: letter, size: size),
          ),
        ),
      ),
    );
  }
}

class _LetterFallback extends StatelessWidget {
  const _LetterFallback({required this.letter, required this.size});

  final String letter;
  final double size;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: const Color(0xFFFCD34D),
      child: Center(
        child: Text(
          letter,
          style: GoogleFonts.inter(
            fontSize: size * 0.43,
            fontWeight: FontWeight.w900,
            color: const Color(0xFF042F2E),
          ),
        ),
      ),
    );
  }
}

class TaxonomyAvatarStackSkeleton extends StatelessWidget {
  const TaxonomyAvatarStackSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    const size = kTaxonomyAvatarStackSize;
    const step = size / 2;
    const slots = 3;
    final width = size + (slots - 1) * step;

    return SizedBox(
      width: width,
      height: size,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          for (var i = 0; i < slots; i++)
            Positioned(
              left: i * step,
              child: Container(
                width: size,
                height: size,
                decoration: BoxDecoration(
                  color: colors.muted.withValues(alpha: 0.28),
                  border: Border.all(color: colors.border.withValues(alpha: 0.5), width: 2),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Search field and blog count pill on one row.
class TaxonomyFeedSearchSection extends StatelessWidget {
  const TaxonomyFeedSearchSection({
    super.key,
    required this.controller,
    required this.hintText,
    required this.count,
    required this.countLabel,
    this.loading = false,
  });

  final TextEditingController controller;
  final String hintText;
  final int count;
  final String countLabel;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Row(
      children: [
        Expanded(
          child: SizedBox(
            height: ProfileActivitySearchSortBar.sortBarHeight,
            child: TextField(
              controller: controller,
              decoration: InputDecoration(
                hintText: hintText,
                prefixIcon: const Icon(Icons.search_rounded, size: 20),
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
                border: OutlineInputBorder(
                  borderSide: BorderSide(color: colors.border, width: 2),
                  borderRadius: BorderRadius.zero,
                ),
                enabledBorder: OutlineInputBorder(
                  borderSide: BorderSide(color: colors.border, width: 2),
                  borderRadius: BorderRadius.zero,
                ),
              ),
            ),
          ),
        ),
        const SizedBox(width: 8),
        if (loading)
          const ProfileCountPillSkeleton()
        else
          ProfileCountPill(count: count, semanticLabel: countLabel),
      ],
    );
  }
}

/// Scrollable top block — icon, title, meta, then search row.
class TaxonomyFeedScrollIntro extends StatelessWidget {
  const TaxonomyFeedScrollIntro({
    super.key,
    required this.icon,
    required this.title,
    required this.searchController,
    required this.searchHint,
    required this.postCount,
    required this.postCountLabel,
    this.meta,
    this.headerAction,
    this.postCountLoading = false,
  });

  final IconData icon;
  final String title;
  final Widget? meta;
  final Widget? headerAction;
  final TextEditingController searchController;
  final String searchHint;
  final int postCount;
  final String postCountLabel;
  final bool postCountLoading;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TaxonomyFeedHeroHeader(
            icon: icon,
            title: title,
            meta: meta,
            headerAction: headerAction,
          ),
          const SizedBox(height: 16),
          TaxonomyFeedSearchSection(
            controller: searchController,
            hintText: searchHint,
            count: postCount,
            countLabel: postCountLabel,
            loading: postCountLoading,
          ),
        ],
      ),
    );
  }
}
