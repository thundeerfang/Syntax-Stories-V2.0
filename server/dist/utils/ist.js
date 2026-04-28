const IST_TZ = 'Asia/Kolkata';
/**
 * Format a Date in India Standard Time for logs, email, and stored `submittedAtIst`.
 */
export function formatDateTimeIst(date = new Date()) {
    return new Intl.DateTimeFormat('en-IN', {
        timeZone: IST_TZ,
        dateStyle: 'medium',
        timeStyle: 'long',
    }).format(date);
}
export function istTimeZoneLabel() {
    return 'Asia/Kolkata (IST)';
}
//# sourceMappingURL=ist.js.map