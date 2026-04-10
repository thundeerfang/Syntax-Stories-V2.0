/**
 * Normalize pasted video URLs to iframe-safe embed URLs (YouTube watch / youtu.be / shorts → embed).
 */

export type NormalizeVideoResult = {
  embedUrl: string | null;
  /** User-facing message when a watch URL was rewritten (not a hard failure). */
  watchLinkNote?: string;
  /** Blocking parse error. */
  error?: string;
};

function extractYoutubeIdFromPath(pathname: string): string | null {
  const embed = pathname.match(/^\/embed\/([^/?]+)/);
  if (embed?.[1]) return embed[1];
  const shorts = pathname.match(/^\/shorts\/([^/?]+)/);
  if (shorts?.[1]) return shorts[1];
  return null;
}

/**
 * Returns canonical YouTube embed URL, or passes through other https URLs for generic iframes.
 */
export function normalizeVideoEmbedUrl(raw: string): NormalizeVideoResult {
  const trimmed = raw.trim();
  if (!trimmed) return { embedUrl: null };

  let urlStr = trimmed;
  if (!/^https?:\/\//i.test(urlStr)) {
    urlStr = `https://${urlStr}`;
  }

  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return { embedUrl: null, error: 'That does not look like a valid URL.' };
  }

  const host = url.hostname.replace(/^www\./i, '').toLowerCase();

  if (host === 'youtu.be') {
    const id = url.pathname.replace(/^\//, '').split('/')[0];
    if (!id || !/^[\w-]{6,}$/i.test(id)) {
      return { embedUrl: null, error: 'Could not read the YouTube video id from this short link.' };
    }
    return { embedUrl: `https://www.youtube.com/embed/${id}` };
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    if (url.pathname.startsWith('/embed/')) {
      const id = extractYoutubeIdFromPath(url.pathname);
      if (id) return { embedUrl: `https://www.youtube.com/embed/${id}${url.search}` };
      return { embedUrl: null, error: 'Invalid YouTube embed link.' };
    }

    if (url.pathname.startsWith('/shorts/')) {
      const id = extractYoutubeIdFromPath(url.pathname);
      if (id) return { embedUrl: `https://www.youtube.com/embed/${id}` };
      return { embedUrl: null, error: 'Invalid YouTube Shorts link.' };
    }

    if (url.pathname === '/watch' || url.pathname.startsWith('/watch/')) {
      const v = url.searchParams.get('v');
      if (!v || !/^[\w-]{6,}$/i.test(v)) {
        return {
          embedUrl: null,
          error:
            'YouTube watch links need a video id (the part after v= in the address bar). Copy the full URL from your browser, or use Share → Embed and paste the embed link.',
        };
      }
      return {
        embedUrl: `https://www.youtube.com/embed/${v}`,
        watchLinkNote:
          'Watch-page links are turned into the embed player so preview works. Saved links use the embed format.',
      };
    }

    const fromPath = extractYoutubeIdFromPath(url.pathname);
    if (fromPath) {
      return { embedUrl: `https://www.youtube.com/embed/${fromPath}` };
    }
  }

  // Vimeo, Loom, etc. — assume user pasted a working embed or player URL
  if (/^https?:\/\//i.test(trimmed)) {
    return { embedUrl: trimmed };
  }

  return { embedUrl: null, error: 'Unsupported video URL.' };
}

export function youtubeVideoIdFromEmbedUrl(embedUrl: string): string | null {
  try {
    const u = new URL(embedUrl);
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();
    if (host !== 'youtube.com' && host !== 'm.youtube.com') return null;
    const m = u.pathname.match(/^\/embed\/([^/?]+)/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export function youtubeThumbnailUrl(embedUrl: string): string | null {
  const id = youtubeVideoIdFromEmbedUrl(embedUrl);
  if (!id) return null;
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}
