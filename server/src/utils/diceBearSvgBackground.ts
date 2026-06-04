import crypto from 'node:crypto';

const SKIP_FILLS = new Set(['none', 'transparent', '#fff', '#ffffff', '#000', '#000000']);

/** Extract hex colors from SVG fill/stroke attributes. */
export function extractSvgHexColors(svg: string): string[] {
  const out: string[] = [];
  const re = /(?:fill|stroke)="(#[0-9a-fA-F]{3,8})"/g;
  for (const m of svg.matchAll(re)) {
    const hex = normalizeHex(m[1]);
    if (!hex || SKIP_FILLS.has(hex.toLowerCase())) continue;
    if (isNeutralGray(hex)) continue;
    out.push(hex);
  }
  return out;
}

function normalizeHex(raw: string): string | null {
  const t = raw.trim();
  if (!t.startsWith('#')) return null;
  if (t.length === 4) {
    const r = t[1];
    const g = t[2];
    const b = t[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (t.length === 7) return t.toLowerCase();
  return null;
}

function isNeutralGray(hex: string): boolean {
  const n = hex.replace('#', '');
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min < 18 && max > 40 && max < 220;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = hex.replace('#', '');
  return {
    r: Number.parseInt(n.slice(0, 2), 16),
    g: Number.parseInt(n.slice(2, 4), 16),
    b: Number.parseInt(n.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${c(r).toString(16).padStart(2, '0')}${c(g).toString(16).padStart(2, '0')}${c(b).toString(16).padStart(2, '0')}`;
}

/** Soft pastel background harmonized with avatar palette (stored without `#` for DiceBear API). */
export function pickBackgroundHex(colors: string[], seed: string): string {
  const base =
    colors.length > 0
      ? colors[crypto.createHash('sha256').update(colors.join(',')).digest()[0] % colors.length]
      : null;

  if (base) {
    const { r, g, b } = hexToRgb(base);
    const mix = 0.72;
    const bg = rgbToHex(r + (255 - r) * mix, g + (255 - g) * mix, b + (255 - b) * mix);
    return bg.replace('#', '');
  }

  return seedToFallbackBackground(seed);
}

export function seedToFallbackBackground(seed: string): string {
  const h = crypto.createHash('sha256').update(seed).digest();
  const hue = h[0] % 360;
  const sat = 42 + (h[1] % 22);
  const light = 78 + (h[2] % 14);
  return hslToHex(hue, sat, light).replace('#', '');
}

function hslToHex(h: number, s: number, l: number): string {
  const ss = s / 100;
  const ll = l / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ll - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

export function svgHasOpaqueBackground(svg: string): boolean {
  return (
    /<rect[^>]*fill="(?!none|transparent)[^"]*"[^>]*width="100%"[^>]*height="100%"/i.test(svg) ||
    /<rect[^>]*width="100%"[^>]*height="100%"[^>]*fill="(?!none|transparent)/i.test(svg)
  );
}

export function injectSvgBackground(svg: string, hexWithHash: string): string {
  const fill = hexWithHash.startsWith('#') ? hexWithHash : `#${hexWithHash}`;
  const rect = `<rect fill="${fill}" width="100%" height="100%" x="0" y="0"/>`;
  if (svgHasOpaqueBackground(svg)) return svg;
  return svg.replace(/(<svg[^>]*>)/i, `$1${rect}`);
}

export function decodeSvgDataUri(dataUri: string): string | null {
  const t = dataUri.trim();
  if (!t.startsWith('data:image/svg+xml')) return null;
  const comma = t.indexOf(',');
  if (comma < 0) return null;
  const payload = t.slice(comma + 1);
  if (t.includes(';base64,')) {
    return Buffer.from(payload, 'base64').toString('utf8');
  }
  return decodeURIComponent(payload);
}

export function encodeSvgDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Ensure stored DiceBear data URIs render with a solid background (fixes legacy transparent exports). */
export function ensureOpaqueDiceBearDataUri(dataUri: string, seedHint = 'user'): string {
  const svg = decodeSvgDataUri(dataUri);
  if (!svg) return dataUri;
  if (svgHasOpaqueBackground(svg)) return dataUri;
  const colors = extractSvgHexColors(svg);
  const bg = pickBackgroundHex(colors, seedHint);
  return encodeSvgDataUri(injectSvgBackground(svg, bg));
}
