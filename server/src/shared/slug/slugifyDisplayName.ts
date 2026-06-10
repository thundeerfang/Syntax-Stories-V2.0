export type SlugifyStyle = 'hyphen' | 'underscore';

export function slugifyDisplayName(
  input: string,
  opts?: { maxLen?: number; style?: SlugifyStyle }
): string {
  const maxLen = opts?.maxLen ?? 64;
  const style = opts?.style ?? 'hyphen';
  const sep = style === 'underscore' ? '_' : '-';

  let base = input
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, sep)
    .replace(new RegExp(`${sep}+`, 'g'), sep)
    .replace(new RegExp(`^${sep}+|${sep}+$`, 'g'), '');

  if (!base) return '';
  if (style === 'underscore' && !/^[a-z]/.test(base)) {
    base = `x${sep}${base}`.replace(new RegExp(`^${sep}+`, 'g'), '');
  }
  if (style === 'hyphen' && !/^[a-z]/.test(base)) {
    base = `x-${base}`.replace(/^-+/, '');
  }

  const trimmed = base.slice(0, maxLen).replace(new RegExp(`${sep}+$`), '');
  return trimmed;
}

/** Pick a unique slug by appending -2, -3, … (or _2 for underscore style). */
export async function reserveUniqueSlug(
  displayName: string,
  exists: (slug: string) => Promise<boolean>,
  opts?: { maxLen?: number; style?: SlugifyStyle }
): Promise<string> {
  const maxLen = opts?.maxLen ?? 64;
  const style = opts?.style ?? 'hyphen';
  let candidate = slugifyDisplayName(displayName, { maxLen, style });
  if (!candidate) {
    candidate = 'item';
  }
  if (!(await exists(candidate))) return candidate;

  for (let i = 2; i < 10_000; i++) {
    const suffix = style === 'underscore' ? `_${i}` : `-${i}`;
    const head = candidate.slice(0, Math.max(1, maxLen - suffix.length));
    const next = `${head}${suffix}`;
    if (!(await exists(next))) return next;
  }

  const tail = Date.now().toString(36);
  const suffix = style === 'underscore' ? `_${tail}` : `-${tail}`;
  return candidate.slice(0, Math.max(1, maxLen - suffix.length)) + suffix;
}
