import { z } from 'zod';

/** Shared Zod error string for feedback-related parsers. */
export function formatZodFeedbackError(err: z.ZodError): string {
  const first = err.issues[0];
  if (!first) return 'Invalid request';
  const path = first.path.length ? first.path.join('.') : 'body';
  return `${path}: ${first.message}`;
}
