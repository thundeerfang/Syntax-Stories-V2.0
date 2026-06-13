/**
 * Client-side mirror of `server/src/utils/uploadImageMeta.ts` for previews before upload
 * (staged media, feedback attachment preview). Authoritative values come from upload API responses.
 */
export function fileBaseNameFromOriginal(originalName: string): string {
  const trimmed = (originalName ?? '').trim();
  const base = trimmed.includes('/') || trimmed.includes('\\')
    ? trimmed.replace(/^.*[/\\]/, '')
    : trimmed;
  const dot = base.lastIndexOf('.');
  const withoutExt = dot > 0 ? base.slice(0, dot) : base;
  const name = withoutExt.trim();
  return name.length > 0 ? name : 'image';
}

export function buildUploadImageMeta(
  originalName: string,
  username: string,
  maxLength = 120
): { title: string; alt: string } {
  const user = (username ?? '').trim() || 'user';
  const fileBase = fileBaseNameFromOriginal(originalName);
  const text = `${user} · ${fileBase}`;
  const clipped = text.length > maxLength ? text.slice(0, maxLength) : text;
  return { title: clipped, alt: clipped };
}

export function uploadResponseAlt(data: { alt?: string; title?: string }): string | undefined {
  return (data.alt ?? data.title)?.trim() || undefined;
}
