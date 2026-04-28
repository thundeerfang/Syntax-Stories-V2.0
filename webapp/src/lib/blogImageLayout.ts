import type { ImageBlockLayout } from '@/types/blog';

/** Single source of truth — matches editor and public post rendering. */
export function coerceImageLayout(raw: unknown): ImageBlockLayout {
  if (raw === 'landscape' || raw === 'square' || raw === 'fullWidth') return raw;
  if (raw === 'natural' || raw === 'center') return 'landscape';
  return 'landscape';
}
