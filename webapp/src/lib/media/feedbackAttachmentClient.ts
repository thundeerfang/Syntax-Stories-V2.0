import { FEEDBACK_MAX_IMAGE_BYTES } from '@/api/feedback';

const ALLOWED = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);

/** First bytes must match declared image type (aligned with server `imageBufferMatchesClaimedMime`). */
function matchesMime(head: Uint8Array, mime: string): boolean {
  if (head.length < 12) return false;
  const m = mime.toLowerCase();
  if (m === 'image/jpeg' || m === 'image/jpg') {
    return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  }
  if (m === 'image/png') {
    return (
      head[0] === 0x89 &&
      head[1] === 0x50 &&
      head[2] === 0x4e &&
      head[3] === 0x47 &&
      head[4] === 0x0d &&
      head[5] === 0x0a &&
      head[6] === 0x1a &&
      head[7] === 0x0a
    );
  }
  if (m === 'image/gif') {
    const sig = String.fromCharCode(head[0]!, head[1]!, head[2]!, head[3]!, head[4]!, head[5]!);
    return sig === 'GIF87a' || sig === 'GIF89a';
  }
  if (m === 'image/webp') {
    const riff = String.fromCharCode(head[0]!, head[1]!, head[2]!, head[3]!);
    const webp = String.fromCharCode(head[8]!, head[9]!, head[10]!, head[11]!);
    return riff === 'RIFF' && webp === 'WEBP';
  }
  return false;
}

export type FeedbackAttachmentValidation = { ok: true } | { ok: false; message: string };

/**
 * Client-side checks before upload: size, MIME allowlist, magic bytes vs declared type.
 * Server still runs ClamAV + Sharp (authoritative malware / malformed image handling).
 */
export async function validateFeedbackAttachmentFile(file: File): Promise<FeedbackAttachmentValidation> {
  const mime = (file.type || '').toLowerCase().trim();
  if (!mime || !ALLOWED.has(mime)) {
    return { ok: false, message: 'Use a JPEG, PNG, GIF, or WebP image.' };
  }
  if (file.size <= 0) {
    return { ok: false, message: 'File is empty.' };
  }
  if (file.size > FEEDBACK_MAX_IMAGE_BYTES) {
    return {
      ok: false,
      message: `Image must be under ${Math.round(FEEDBACK_MAX_IMAGE_BYTES / (1024 * 1024))} MB.`,
    };
  }
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!matchesMime(head, mime)) {
    return { ok: false, message: 'File content does not match an image type (possible spoofed extension).' };
  }
  return { ok: true };
}
