class VideoEmbedNormalizeResult {
  const VideoEmbedNormalizeResult({this.embedUrl, this.error});

  final String? embedUrl;
  final String? error;
}

/// Mirrors webapp `normalizeVideoEmbedUrl` — YouTube watch/shorts → embed URL.
VideoEmbedNormalizeResult normalizeVideoEmbedUrl(String raw) {
  var trimmed = raw.trim();
  if (trimmed.isEmpty) return const VideoEmbedNormalizeResult();

  if (!RegExp(r'^https?://', caseSensitive: false).hasMatch(trimmed)) {
    trimmed = 'https://$trimmed';
  }

  final uri = Uri.tryParse(trimmed);
  if (uri == null) {
    return const VideoEmbedNormalizeResult(error: 'That does not look like a valid URL.');
  }

  final host = uri.host.replaceFirst(RegExp(r'^www\.', caseSensitive: false), '').toLowerCase();

  if (host == 'youtu.be') {
    final id = uri.pathSegments.isNotEmpty ? uri.pathSegments.first : '';
    if (!_isYoutubeId(id)) {
      return const VideoEmbedNormalizeResult(
        error: 'Could not read the YouTube video id from this short link.',
      );
    }
    return VideoEmbedNormalizeResult(embedUrl: 'https://www.youtube.com/embed/$id');
  }

  if (host == 'youtube.com' || host == 'm.youtube.com' || host == 'music.youtube.com') {
    if (uri.pathSegments.isNotEmpty && uri.pathSegments.first == 'embed') {
      final id = uri.pathSegments.length > 1 ? uri.pathSegments[1] : '';
      if (_isYoutubeId(id)) {
        return VideoEmbedNormalizeResult(embedUrl: 'https://www.youtube.com/embed/$id');
      }
      return const VideoEmbedNormalizeResult(error: 'Invalid YouTube embed link.');
    }
    if (uri.pathSegments.isNotEmpty && uri.pathSegments.first == 'shorts') {
      final id = uri.pathSegments.length > 1 ? uri.pathSegments[1] : '';
      if (_isYoutubeId(id)) {
        return VideoEmbedNormalizeResult(embedUrl: 'https://www.youtube.com/embed/$id');
      }
      return const VideoEmbedNormalizeResult(error: 'Invalid YouTube Shorts link.');
    }
    if (uri.path == '/watch' || uri.path.startsWith('/watch/')) {
      final v = uri.queryParameters['v'];
      if (!_isYoutubeId(v)) {
        return const VideoEmbedNormalizeResult(
          error: 'YouTube watch links need a video id (the v= part in the URL).',
        );
      }
      return VideoEmbedNormalizeResult(embedUrl: 'https://www.youtube.com/embed/$v');
    }
  }

  if (uri.scheme == 'https' || uri.scheme == 'http') {
    return VideoEmbedNormalizeResult(embedUrl: trimmed);
  }

  return const VideoEmbedNormalizeResult(error: 'Only http(s) video URLs are supported.');
}

bool _isYoutubeId(String? id) {
  if (id == null || id.isEmpty) return false;
  return RegExp(r'^[\w-]{6,}$', caseSensitive: false).hasMatch(id);
}

String? youtubeVideoIdFromEmbedUrl(String embedUrl) {
  final uri = Uri.tryParse(embedUrl.trim());
  if (uri == null) return null;
  final host = uri.host.replaceFirst(RegExp(r'^www\.', caseSensitive: false), '').toLowerCase();
  if (host != 'youtube.com' && host != 'm.youtube.com') return null;
  final segments = uri.pathSegments.where((s) => s.isNotEmpty).toList();
  if (segments.isEmpty || segments.first != 'embed') return null;
  if (segments.length < 2) return null;
  final id = segments[1];
  return _isYoutubeId(id) ? id : null;
}

String? youtubeThumbnailUrl(String embedUrl) {
  final id = youtubeVideoIdFromEmbedUrl(embedUrl);
  if (id == null) return null;
  return 'https://i.ytimg.com/vi/$id/mqdefault.jpg';
}

String clampVideoEmbedSize({
  required int videoCount,
  required String size,
  required String layout,
}) {
  if (layout == 'column') return size;
  if (videoCount >= 3) return 'sm';
  if (videoCount == 2) return size == 'lg' ? 'md' : size;
  return size;
}

bool videoEmbedSizeDisabled({
  required String option,
  required int videoCount,
  required String layout,
}) {
  if (layout == 'column') return false;
  if (videoCount >= 3) return option != 'sm';
  if (videoCount == 2) return option == 'lg';
  return false;
}

double videoEmbedPreviewWidth(String size) {
  return switch (size) {
    'sm' => 124,
    'lg' => 320,
    _ => 184,
  };
}
