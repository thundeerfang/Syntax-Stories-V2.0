import crypto from 'node:crypto';

/** §22 — stable UTF-8 NFC, fixed field order. */
export function canonicalLegalPayload(title: string, summary: string, body: string): string {
  const t = title.normalize('NFC');
  const s = summary.normalize('NFC');
  const b = body.normalize('NFC').replace(/\r\n/g, '\n');
  return `${t}\n\n${s}\n\n${b}`;
}

export function computeLegalContentHash(title: string, summary: string, body: string): string {
  const bytes = Buffer.from(canonicalLegalPayload(title, summary, body), 'utf8');
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

export function verifyRevisionHash(params: {
  title: string;
  summary: string;
  body: string;
  contentHash: string;
}): boolean {
  return computeLegalContentHash(params.title, params.summary, params.body) === params.contentHash;
}

/** For idempotency request hashing (normalized JSON). */
export function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
  const o = obj as Record<string, unknown>;
  const keys = Object.keys(o).sort();
  return `{${keys.map((k) => JSON.stringify(k) + ':' + stableStringify(o[k])).join(',')}}`;
}

export function hashIdempotencyPayload(obj: unknown): string {
  return crypto.createHash('sha256').update(stableStringify(obj), 'utf8').digest('hex');
}

export function randomTokenHex(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}
