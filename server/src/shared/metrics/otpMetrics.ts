/**
 * Lightweight in-process counters for OTP flows (logs / future Prometheus).
 */

const c = {
  otp_send_total: 0,
  otp_send_rejected_total: 0,
  otp_verify_success_total: 0,
  otp_verify_fail_total: 0,
};

export function bumpOtpMetric(
  name:
    | 'otp_send_total'
    | 'otp_send_rejected_total'
    | 'otp_verify_success_total'
    | 'otp_verify_fail_total'
): void {
  c[name] += 1;
}

export function getOtpMetricsSnapshot(): Record<string, number> {
  return { ...c };
}
