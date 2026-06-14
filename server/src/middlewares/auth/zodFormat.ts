import type { ZodError } from "zod";
export function formatZodError(err: ZodError): Array<{
  message: string;
  path: (string | number)[];
}> {
  return err.issues.map((issue) => ({
    message: issue.message,
    path: [...issue.path],
  }));
}
