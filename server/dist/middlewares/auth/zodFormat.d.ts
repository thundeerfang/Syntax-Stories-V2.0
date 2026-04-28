import type { ZodError } from 'zod';
/** Shape similar to Joi `details` for existing API clients. */
export declare function formatZodError(err: ZodError): Array<{
    message: string;
    path: (string | number)[];
}>;
//# sourceMappingURL=zodFormat.d.ts.map