import 'package:flutter/material.dart';

import '../models/squad_summary.dart';
import '../screens/squads/squad_detail_screen.dart';

Future<void> openSquadDetail(
  BuildContext context, {
  required String slug,
  SquadSummary? preview,
}) {
  final trimmed = slug.trim();
  if (trimmed.isEmpty) return Future.value();

  return Navigator.of(context).push<void>(
    MaterialPageRoute<void>(
      builder: (_) => SquadDetailScreen(
        slug: trimmed,
        preview: preview,
      ),
    ),
  );
}

Future<void> openSquadSummary(BuildContext context, SquadSummary squad) {
  return openSquadDetail(context, slug: squad.slug, preview: squad);
}

String? squadSlugFromSearchHref(String href) {
  final trimmed = href.trim();
  if (trimmed.isEmpty) return null;
  final uri = Uri.tryParse(trimmed.startsWith('/') ? 'https://syntax.local$trimmed' : trimmed);
  if (uri == null) return null;
  final segments = uri.pathSegments;
  if (segments.length >= 2 && segments[0] == 'squads') {
    return Uri.decodeComponent(segments[1]);
  }
  if (segments.length == 1 && segments[0] == 'squads' && uri.path.endsWith('/')) {
    return null;
  }
  return null;
}
