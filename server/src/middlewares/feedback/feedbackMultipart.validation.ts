import { z } from 'zod';
import { formatZodFeedbackError } from './feedbackBody.validation.js';
import { countFeedbackWords, FEEDBACK_MIN_DESC_WORDS } from './feedbackWordCount.js';

const objectId24 = z.string().regex(/^[a-fA-F0-9]{24}$/);

const multipartBase = z.object({
  categoryId: objectId24,
  subject: z.string().trim().min(1, 'Subject is required.').max(200),
  description: z
    .string()
    .trim()
    .min(1, 'Message is required.')
    .max(5000)
    .refine((s) => countFeedbackWords(s) >= FEEDBACK_MIN_DESC_WORDS, {
      message: `Message must be at least ${FEEDBACK_MIN_DESC_WORDS} words.`,
    }),
  clientMeta: z.string().max(50_000).optional(),
  attachmentTitle: z.string().trim().max(120).optional(),
});

export type ParsedMultipartFeedback = {
  categoryId: string;
  subject: string;
  description: string;
  clientMeta?: Record<string, unknown>;
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

/** Signed-in users only — guest fields are rejected at the route layer. */
export function parseMultipartFeedback(
  body: Record<string, unknown>
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

  return {
    ok: true,
    data: {
      categoryId: parsed.data.categoryId,
      subject: parsed.data.subject,
      description: parsed.data.description,
      clientMeta,
      attachmentTitle: parsed.data.attachmentTitle?.trim() || undefined,
    },
  };
}
