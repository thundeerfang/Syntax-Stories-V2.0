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
