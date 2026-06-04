import type { RiskAssessmentPayload } from '@/admin/api/management';

export function riskTone(decision: RiskAssessmentPayload['decision']) {
  if (decision === 'BLOCK') return 'error' as const;
  if (decision === 'STEP_UP') return 'warning' as const;
  return 'success' as const;
}
