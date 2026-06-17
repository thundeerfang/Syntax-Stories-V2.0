import 'package:flutter/material.dart';

import '../models/blog_taxonomy.dart';
import '../models/search_hit.dart';
import '../screens/topics/topics_category_feed_screen.dart';
import '../screens/topics/topics_tag_feed_screen.dart';

String? _decodePathSegment(String raw) {
  final trimmed = raw.trim();
  if (trimmed.isEmpty) return null;
  return Uri.decodeComponent(trimmed);
}

Uri? _parseSearchHref(String href) {
  final trimmed = href.trim();
  if (trimmed.isEmpty) return null;
  return Uri.tryParse(trimmed.startsWith('/') ? 'https://syntax.local$trimmed' : trimmed);
}

String? categorySlugFromSearchHref(String href) {
  final uri = _parseSearchHref(href);
  if (uri == null) return null;
  final segments = uri.pathSegments;
  if (segments.length >= 3 && segments[0] == 'topics' && segments[1] == 'category') {
    return _decodePathSegment(segments[2]);
  }
  return null;
}

String? tagSlugFromSearchHref(String href) {
  final uri = _parseSearchHref(href);
  if (uri == null) return null;
  final segments = uri.pathSegments;
  if (segments.length >= 2 && segments[0] == 'topics' && segments[1] != 'category') {
    return _decodePathSegment(segments[1]);
  }
  return null;
}

BlogTaxonomyRow categoryRowFromSearchHit(SearchHit hit) {
  final slug = categorySlugFromSearchHref(hit.href) ??
      hit.id.replaceFirst(RegExp(r'^cat:'), '').trim();
  final name = hit.label.trim().isNotEmpty ? hit.label.trim() : slug;
  return BlogTaxonomyRow(
    slug: slug,
    name: name,
    postCount: hit.postCount ?? 0,
  );
}

BlogTaxonomyRow tagRowFromSearchHit(SearchHit hit) {
  final slug = tagSlugFromSearchHref(hit.href) ??
      hit.id.replaceFirst(RegExp(r'^tag:'), '').replaceFirst(RegExp(r'^#'), '').trim();
  final name = hit.label.trim().isNotEmpty
      ? hit.label.replaceFirst(RegExp(r'^#'), '').trim()
      : slug;
  return BlogTaxonomyRow(
    slug: slug,
    name: name,
    postCount: hit.postCount ?? 0,
  );
}

Future<void> openCategoryFeed(BuildContext context, BlogTaxonomyRow category) {
  final slug = category.slug.trim();
  if (slug.isEmpty) return Future.value();

  return Navigator.of(context).push<void>(
    MaterialPageRoute<void>(
      builder: (_) => TopicsCategoryFeedScreen(category: category),
    ),
  );
}

Future<void> openTagFeed(BuildContext context, BlogTaxonomyRow tag) {
  final slug = tag.slug.trim();
  if (slug.isEmpty) return Future.value();

  return Navigator.of(context).push<void>(
    MaterialPageRoute<void>(
      builder: (_) => TopicsTagFeedScreen(tag: tag),
    ),
  );
}

Future<void> openCategoryFromSlug(
  BuildContext context, {
  required String slug,
  String? name,
  int postCount = 0,
}) {
  final trimmed = slug.trim();
  if (trimmed.isEmpty) return Future.value();
  return openCategoryFeed(
    context,
    BlogTaxonomyRow(
      slug: trimmed,
      name: (name ?? trimmed).trim().isNotEmpty ? (name ?? trimmed).trim() : trimmed,
      postCount: postCount,
    ),
  );
}
