import { z } from 'zod';
import { formatZodFeedbackError } from './feedbackBody.validation.js';

const objectId24 = z.string().regex(/^[a-fA-F0-9]{24}$/);

const multipartBase = z.object({
  categoryId: objectId24,
  subject: z.string().trim().min(1).max(200),
  description: z.string().trim().min(10).max(5000),
  clientMeta: z.string().max(50_000).optional(),
  altcha: z.string().max(50_000).optional(),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  email: z.string().trim().max(254).optional(),
  attachmentTitle: z.string().trim().max(120).optional(),
});

export type ParsedMultipartFeedback = {
  categoryId: string;
  subject: string;
  description: string;
  clientMeta?: Record<string, unknown>;
  altcha?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  attachmentTitle?: string;
};

function parseClientMetaJson(raw: string | undefined): Record<string, unknown> | undefined {
  if (raw == null || raw === '') return undefined;
  try {
    const v = JSON.parse(raw) as unknown;
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
    return undefined;
  } catch {
    return undefined;
  }
}

function isValidEmail(s: string): boolean {
  if (!s || s.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function parseMultipartFeedback(
  body: Record<string, unknown>,
  isAuthed: boolean
): { ok: true; data: ParsedMultipartFeedback } | { ok: false; message: string } {
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(body)) {
    flat[k] = typeof v === 'string' ? v : v != null ? String(v) : undefined;
  }

  const parsed = multipartBase.safeParse(flat);
  if (!parsed.success) {
    return { ok: false, message: formatZodFeedbackError(parsed.error) };
  }

  const clientMeta = parseClientMetaJson(parsed.data.clientMeta);
  if (parsed.data.clientMeta && parsed.data.clientMeta.trim() !== '' && clientMeta === undefined) {
    return { ok: false, message: 'clientMeta must be a JSON object.' };
  }

  if (!isAuthed) {
    const fn = parsed.data.firstName?.trim() ?? '';
    const ln = parsed.data.lastName?.trim() ?? '';
    const em = parsed.data.email?.trim().toLowerCase() ?? '';
    if (fn.length < 1 || fn.length > 80) return { ok: false, message: 'firstName: First name is required (1–80 characters).' };
    if (ln.length < 1 || ln.length > 80) return { ok: false, message: 'lastName: Last name is required (1–80 characters).' };
    if (!isValidEmail(em)) return { ok: false, message: 'email: Valid email is required.' };
    return {
      ok: true,
      data: {
        categoryId: parsed.data.categoryId,
        subject: parsed.data.subject,
        description: parsed.data.description,
        clientMeta,
        altcha: parsed.data.altcha?.trim() || undefined,
        firstName: fn,
        lastName: ln,
        email: em,
        attachmentTitle: parsed.data.attachmentTitle?.trim() || undefined,
      },
    };
  }

  return {
    ok: true,
    data: {
      categoryId: parsed.data.categoryId,
      subject: parsed.data.subject,
      description: parsed.data.description,
      clientMeta,
      altcha: parsed.data.altcha?.trim() || undefined,
      attachmentTitle: parsed.data.attachmentTitle?.trim() || undefined,
    },
  };
}
