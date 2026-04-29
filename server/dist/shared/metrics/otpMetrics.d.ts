/**
 * Lightweight in-process counters for OTP flows (logs / future Prometheus).
 */
export declare function bumpOtpMetric(name: 'otp_send_total' | 'otp_send_rejected_total' | 'otp_verify_success_total' | 'otp_verify_fail_total'): void;
export declare function getOtpMetricsSnapshot(): Record<string, number>;
//# sourceMappingURL=otpMetrics.d.ts.map