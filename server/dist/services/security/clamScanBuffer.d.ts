/**
 * Send buffer to clamd via INSTREAM (TCP).
 * @see https://manpages.debian.org/testing/clamav-daemon/clamd.8.en.html
 */
export declare function scanBufferWithClamAV(buffer: Buffer): Promise<{
    ok: boolean;
    detail: string;
}>;
//# sourceMappingURL=clamScanBuffer.d.ts.map