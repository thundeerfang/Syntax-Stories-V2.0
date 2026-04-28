/** Shape similar to Joi `details` for existing API clients. */
export function formatZodError(err) {
    return err.issues.map((issue) => ({
        message: issue.message,
        path: [...issue.path],
    }));
}
//# sourceMappingURL=zodFormat.js.map