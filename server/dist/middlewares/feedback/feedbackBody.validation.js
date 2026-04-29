/** Shared Zod error string for feedback-related parsers. */
export function formatZodFeedbackError(err) {
    const first = err.issues[0];
    if (!first)
        return 'Invalid request';
    const path = first.path.length ? first.path.join('.') : 'body';
    return `${path}: ${first.message}`;
}
//# sourceMappingURL=feedbackBody.validation.js.map