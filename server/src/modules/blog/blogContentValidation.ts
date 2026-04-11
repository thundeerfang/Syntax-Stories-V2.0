/**
 * Validates `BlogPost.content` (JSON string of Block[]): structure, size limits, allowed block types.
 * Strips legacy `gif` blocks; normalizes payloads to JSON-safe plain objects.
 */

const MAX_CONTENT_CHARS = 2_500_000;
const MAX_BLOCKS = 300;
const MAX_BLOCK_ID_LEN = 128;
const MAX_SECTION_ID_LEN = 80;
const MAX_PARAGRAPH_TEXT = 400_000;
const MAX_RICH_DOC_JSON_CHARS = 900_000;
const MAX_HEADING_TEXT = 8_000;
const MAX_URL_LEN = 2_000;
const MAX_CAPTION = 4_000;
const MAX_GITHUB_DESC = 12_000;
const MAX_GENERIC_PAYLOAD_JSON = 120_000;
const MAX_CODE_BODY_CHARS = 200_000;

const ALLOWED_TYPES = new Set([
  'paragraph',
  'heading',
  'code',
  'partition',
  'image',
  'videoEmbed',
  'link',
  'githubRepo',
  'unsplashImage',
  'table',
  'mermaidDiagram',
]);

const MAX_TABLE_ROWS = 40;
const MAX_TABLE_COLS = 16;
const MAX_TABLE_CELL_CHARS = 4_000;
const MAX_MERMAID_SOURCE_CHARS = 120_000;

export type BlogContentValidationResult =
  | { ok: true; normalizedJson: string }
  | { ok: false; status: number; message: string };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function truncateString(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max);
}

function assertPayloadJsonSize(value: unknown, maxChars: number, label: string): void {
  let encoded: string;
  try {
    encoded = JSON.stringify(value);
  } catch {
    throw new Error(`${label} must be JSON-serializable`);
  }
  if (encoded.length > maxChars) {
    throw new Error(`${label} exceeds maximum size`);
  }
}

function sanitizeGenericPayload(p: unknown): Record<string, unknown> {
  if (p == null) return {};
  if (!isPlainObject(p)) throw new Error('payload must be an object');
  assertPayloadJsonSize(p, MAX_GENERIC_PAYLOAD_JSON, 'payload');
  return JSON.parse(JSON.stringify(p)) as Record<string, unknown>;
}

function sanitizeParagraphPayload(p: unknown): Record<string, unknown> {
  if (p == null) return {};
  if (!isPlainObject(p)) throw new Error('paragraph payload must be an object');
  const out: Record<string, unknown> = {};
  if (typeof p.text === 'string') out.text = truncateString(p.text, MAX_PARAGRAPH_TEXT);
  if ('doc' in p) {
    assertPayloadJsonSize(p.doc, MAX_RICH_DOC_JSON_CHARS, 'paragraph.doc');
    out.doc = JSON.parse(JSON.stringify(p.doc));
  }
  if (p.version === 'plain' || p.version === 'rich-text') out.version = p.version;
  return out;
}

function sanitizeHeadingPayload(p: unknown): Record<string, unknown> {
  if (p == null) return {};
  if (!isPlainObject(p)) throw new Error('heading payload must be an object');
  const out: Record<string, unknown> = {};
  if (typeof p.text === 'string') out.text = truncateString(p.text, MAX_HEADING_TEXT);
  if (p.level === 2 || p.level === 3) out.level = p.level;
  return out;
}

function sanitizeImagePayload(p: unknown): Record<string, unknown> {
  if (p == null) return {};
  if (!isPlainObject(p)) throw new Error('image payload must be an object');
  const out: Record<string, unknown> = {};
  if (typeof p.url === 'string') out.url = truncateString(p.url, MAX_URL_LEN);
  if (typeof p.title === 'string') out.title = truncateString(p.title, MAX_CAPTION);
  if (typeof (p as { altText?: string }).altText === 'string') {
    out.altText = truncateString((p as { altText: string }).altText, MAX_CAPTION);
  }
  const layout = p.layout;
  if (layout === 'landscape' || layout === 'square' || layout === 'fullWidth' || layout === 'natural' || layout === 'center') {
    out.layout = layout;
  }
  return out;
}

function sanitizeVideoEmbedPayload(p: unknown): Record<string, unknown> {
  if (p == null) return {};
  if (!isPlainObject(p)) throw new Error('videoEmbed payload must be an object');
  const out: Record<string, unknown> = {};
  if (typeof p.url === 'string') out.url = truncateString(p.url, MAX_URL_LEN);
  if (Array.isArray(p.videos)) {
    const urls = p.videos
      .filter((x): x is string => typeof x === 'string')
      .map((u) => truncateString(u, MAX_URL_LEN))
      .slice(0, 3);
    if (urls.length) out.videos = urls;
  }
  if (p.layout === 'row' || p.layout === 'column') out.layout = p.layout;
  if (p.size === 'sm' || p.size === 'md' || p.size === 'lg') out.size = p.size;
  return out;
}

function sanitizeCodePayload(p: unknown): Record<string, unknown> {
  if (p == null) return {};
  if (!isPlainObject(p)) throw new Error('code payload must be an object');
  const out: Record<string, unknown> = {};
  if (typeof (p as { code?: string }).code === 'string') {
    out.code = truncateString((p as { code: string }).code, MAX_CODE_BODY_CHARS);
  } else if (typeof (p as { text?: string }).text === 'string') {
    out.code = truncateString((p as { text: string }).text, MAX_CODE_BODY_CHARS);
  }
  const lang = (p as { language?: string }).language;
  if (typeof lang === 'string' && /^[a-z0-9#+.\-]{1,72}$/i.test(lang.trim())) {
    out.language = lang.trim().toLowerCase().slice(0, 72);
  }
  const src = (p as { languageSource?: string }).languageSource;
  if (src === 'auto' || src === 'manual') out.languageSource = src;
  return out;
}

function sanitizeGithubPayload(p: unknown): Record<string, unknown> {
  if (p == null) return {};
  if (!isPlainObject(p)) throw new Error('githubRepo payload must be an object');
  const out: Record<string, unknown> = {};
  for (const key of ['owner', 'repo', 'name', 'url', 'avatarUrl'] as const) {
    if (typeof p[key] === 'string') out[key] = truncateString(p[key] as string, MAX_URL_LEN);
  }
  if (typeof p.description === 'string') out.description = truncateString(p.description, MAX_GITHUB_DESC);
  return out;
}

function sanitizeTablePayload(p: unknown): Record<string, unknown> {
  if (p == null) return { rows: [] };
  if (!isPlainObject(p)) throw new Error('table payload must be an object');
  const out: Record<string, unknown> = {};
  if (typeof p.caption === 'string') out.caption = truncateString(p.caption, MAX_CAPTION);
  const rowsIn = p.rows;
  if (!Array.isArray(rowsIn)) {
    out.rows = [];
    return out;
  }
  const rows: string[][] = [];
  for (let r = 0; r < rowsIn.length && r < MAX_TABLE_ROWS; r++) {
    const row = rowsIn[r];
    if (!Array.isArray(row)) continue;
    const cells: string[] = [];
    for (let c = 0; c < row.length && c < MAX_TABLE_COLS; c++) {
      const cell = row[c];
      cells.push(typeof cell === 'string' ? truncateString(cell, MAX_TABLE_CELL_CHARS) : String(cell ?? ''));
    }
    if (cells.length) rows.push(cells);
  }
  out.rows = rows;
  return out;
}

function sanitizeMermaidPayload(p: unknown): Record<string, unknown> {
  if (p == null) return { source: '' };
  if (!isPlainObject(p)) throw new Error('mermaidDiagram payload must be an object');
  const out: Record<string, unknown> = {};
  if (typeof (p as { source?: string }).source === 'string') {
    out.source = truncateString((p as { source: string }).source, MAX_MERMAID_SOURCE_CHARS);
  } else {
    out.source = '';
  }
  return out;
}

function sanitizeUnsplashPayload(p: unknown): Record<string, unknown> {
  if (p == null) return {};
  if (!isPlainObject(p)) throw new Error('unsplashImage payload must be an object');
  const out: Record<string, unknown> = {};
  if (typeof p.url === 'string') out.url = truncateString(p.url, MAX_URL_LEN);
  if (typeof p.photographer === 'string') out.photographer = truncateString(p.photographer, MAX_CAPTION);
  if (typeof p.caption === 'string') out.caption = truncateString(p.caption, MAX_CAPTION);
  if (typeof p.unsplashPhotoId === 'string') {
    out.unsplashPhotoId = truncateString(p.unsplashPhotoId, 128);
  }
  const layout = p.layout;
  if (layout === 'landscape' || layout === 'square' || layout === 'fullWidth') out.layout = layout;
  return out;
}

function sanitizePayloadForType(type: string, payload: unknown): Record<string, unknown> {
  switch (type) {
    case 'paragraph':
      return sanitizeParagraphPayload(payload);
    case 'heading':
      return sanitizeHeadingPayload(payload);
    case 'image':
      return sanitizeImagePayload(payload);
    case 'videoEmbed':
      return sanitizeVideoEmbedPayload(payload);
    case 'githubRepo':
      return sanitizeGithubPayload(payload);
    case 'unsplashImage':
      return sanitizeUnsplashPayload(payload);
    case 'partition':
      return payload == null ? {} : sanitizeGenericPayload(payload);
    case 'code':
      return sanitizeCodePayload(payload);
    case 'link':
      return sanitizeGenericPayload(payload);
    case 'table':
      return sanitizeTablePayload(payload);
    case 'mermaidDiagram':
      return sanitizeMermaidPayload(payload);
  }
  throw new Error(`Unhandled block type: ${type}`);
}

/**
 * Validates blog post `content` string. Returns normalized JSON (gif blocks removed).
 */
export function validateBlogPostContent(raw: string): BlogContentValidationResult {
  if (typeof raw !== 'string') {
    return { ok: false, status: 400, message: 'Content must be a string' };
  }
  if (raw.length > MAX_CONTENT_CHARS) {
    return { ok: false, status: 400, message: `Content exceeds maximum length (${MAX_CONTENT_CHARS} characters)` };
  }
  const toParse = raw.trim() === '' ? '[]' : raw.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(toParse);
  } catch {
    return { ok: false, status: 400, message: 'Content must be a JSON array of blocks' };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, status: 400, message: 'Content must be a JSON array of blocks' };
  }
  if (parsed.length > MAX_BLOCKS) {
    return { ok: false, status: 400, message: `At most ${MAX_BLOCKS} blocks allowed` };
  }

  const out: Array<{ id: string; type: string; sectionId?: string; payload?: Record<string, unknown> }> = [];

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (!isPlainObject(item)) {
      return { ok: false, status: 400, message: `Block at index ${i} must be an object` };
    }
    if (item.type === 'gif') {
      continue;
    }
    const id = item.id;
    const type = item.type;
    if (typeof id !== 'string' || !id.trim()) {
      return { ok: false, status: 400, message: `Block at index ${i} must have a non-empty string id` };
    }
    if (id.length > MAX_BLOCK_ID_LEN) {
      return { ok: false, status: 400, message: `Block id at index ${i} is too long` };
    }
    if (typeof type !== 'string' || !ALLOWED_TYPES.has(type)) {
      return {
        ok: false,
        status: 400,
        message: `Unknown or disallowed block type at index ${i}: ${String(type)}`,
      };
    }
    let sectionId: string | undefined;
    if (item.sectionId !== undefined) {
      if (typeof item.sectionId !== 'string') {
        return { ok: false, status: 400, message: `Block sectionId at index ${i} must be a string` };
      }
      sectionId = truncateString(item.sectionId, MAX_SECTION_ID_LEN);
    }
    let payload: Record<string, unknown> | undefined;
    if (item.payload !== undefined) {
      try {
        payload = sanitizePayloadForType(type, item.payload);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Invalid block payload';
        return { ok: false, status: 400, message: `Block ${i} (${type}): ${msg}` };
      }
    }
    const block: { id: string; type: string; sectionId?: string; payload?: Record<string, unknown> } = {
      id: id.trim(),
      type,
    };
    if (sectionId !== undefined) block.sectionId = sectionId;
    if (payload !== undefined && Object.keys(payload).length > 0) block.payload = payload;
    out.push(block);
  }

  return { ok: true, normalizedJson: JSON.stringify(out) };
}

/**
 * Thumbnail must be https, or http on localhost (dev). Max length aligned with model.
 */
export function sanitizeThumbnailUrl(input: string | undefined | null): string | undefined {
  if (input == null || typeof input !== 'string') return undefined;
  const t = input.trim().slice(0, 2000);
  if (!t) return undefined;
  try {
    const u = new URL(t);
    if (u.protocol === 'https:') return t;
    const dev = process.env.NODE_ENV !== 'production';
    if (u.protocol === 'http:' && dev) return t;
    if (
      u.protocol === 'http:' &&
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]')
    )
      return t;
  } catch {
    return undefined;
  }
  return undefined;
}
