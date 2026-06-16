import 'package:flutter/material.dart';

import '../models/search_hit.dart';
import '../models/user_summary.dart';
import '../screens/public_profile_screen.dart';

String? usernameFromSearchHref(String href) {
  final trimmed = href.trim();
  if (trimmed.isEmpty) return null;
  final uri = Uri.tryParse(trimmed.startsWith('/') ? 'https://syntax.local$trimmed' : trimmed);
  if (uri == null) return null;
  final segments = uri.pathSegments;
  if (segments.isEmpty || segments[0] != 'u') return null;
  if (segments.length < 2) return null;
  final username = Uri.decodeComponent(segments[1].trim().toLowerCase());
  return username.isNotEmpty ? username : null;
}

UserSummary? previewUserFromSearchHit(SearchHit hit) {
  if (hit.type != SearchEntityType.user) return null;
  final username = usernameFromSearchHref(hit.href) ?? hit.sublabel?.replaceFirst('@', '').trim();
  if (username == null || username.isEmpty) return null;
  return UserSummary(
    id: hit.id,
    email: '',
    fullName: hit.label.trim().isNotEmpty ? hit.label.trim() : username,
    username: username,
    profileImg: hit.imageUrl,
  );
}

Future<void> openPublicProfile(
  BuildContext context, {
  required String username,
  UserSummary? preview,
}) {
  final slug = username.trim().toLowerCase();
  if (slug.isEmpty) return Future.value();

  return Navigator.of(context).push<void>(
    MaterialPageRoute<void>(
      builder: (_) => PublicProfileScreen(
        username: slug,
        preview: preview,
      ),
    ),
  );
}

Future<void> openUserFromSearchHit(BuildContext context, SearchHit hit) {
  final username = usernameFromSearchHref(hit.href) ??
      hit.sublabel?.replaceFirst('@', '').trim().toLowerCase();
  if (username == null || username.isEmpty) return Future.value();
  return openPublicProfile(
    context,
    username: username,
    preview: previewUserFromSearchHit(hit),
  );
}
