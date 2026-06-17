import 'package:flutter/material.dart';

import '../models/blog_feed_post.dart';
import '../models/search_hit.dart';
import '../screens/blog/blog_post_detail_screen.dart';

Future<void> openBlogFeedPost(BuildContext context, BlogFeedPost post) {
  final username = post.author.username.trim();
  final slug = post.slug.trim();
  if (slug.isEmpty) return Future.value();

  return Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => BlogPostDetailScreen(
        username: username.isNotEmpty ? username : 'unknown',
        slug: slug,
        preview: post,
      ),
    ),
  );
}

Future<void> openBlogPostBySlug(
  BuildContext context, {
  required String username,
  required String slug,
}) {
  return Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => BlogPostDetailScreen(
        username: username,
        slug: slug,
      ),
    ),
  );
}

({String username, String slug})? blogPostRouteFromSearchHref(String href) {
  final trimmed = href.trim();
  if (trimmed.isEmpty) return null;
  final uri = Uri.tryParse(trimmed.startsWith('/') ? 'https://syntax.local$trimmed' : trimmed);
  if (uri == null) return null;
  final segments = uri.pathSegments;
  if (segments.length < 3 || segments[0] != 'blogs') return null;
  final username = Uri.decodeComponent(segments[1].trim());
  final slug = Uri.decodeComponent(segments[2].trim());
  if (username.isEmpty || slug.isEmpty) return null;
  return (username: username, slug: slug);
}

Future<void> openBlogFromSearchHit(BuildContext context, SearchHit hit) {
  final route = blogPostRouteFromSearchHref(hit.href);
  if (route == null) return Future.value();
  return openBlogPostBySlug(
    context,
    username: route.username,
    slug: route.slug,
  );
}
