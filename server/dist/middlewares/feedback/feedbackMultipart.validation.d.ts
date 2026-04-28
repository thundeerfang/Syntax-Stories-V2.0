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
export declare function parseMultipartFeedback(body: Record<string, unknown>, isAuthed: boolean): {
    ok: true;
    data: ParsedMultipartFeedback;
} | {
    ok: false;
    message: string;
};
//# sourceMappingURL=feedbackMultipart.validation.d.ts.map