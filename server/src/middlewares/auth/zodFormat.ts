import type { ZodError } from 'zod';

/** Shape similar to Joi `details` for existing API clients. */
export function formatZodError(err: ZodError): Array<{ message: string; path: (string | number)[] }> {
  return err.issues.map((issue) => ({
    message: issue.message,
    path: [...issue.path],
  }));
}
