/** Session trust tiers for admin operators (Phase 5). */
export type SessionTier = 'standard' | 'privileged' | 'root' | 'impersonation' | 'service';

const ROOT_LEVEL = 900;
const PRIVILEGED_LEVEL = 400;

export function resolveSessionTier(opts: {
  roleLevel: number;
  impersonating?: boolean;
}): SessionTier {
  if (opts.impersonating) return 'impersonation';
  if (opts.roleLevel >= ROOT_LEVEL) return 'root';
  if (opts.roleLevel >= PRIVILEGED_LEVEL) return 'privileged';
  return 'standard';
}

const TIER_RANK: Record<SessionTier, number> = {
  standard: 1,
  privileged: 2,
  root: 3,
  impersonation: 2,
  service: 3,
};

export function tierMeetsRequired(actor: SessionTier, required: SessionTier): boolean {
  return TIER_RANK[actor] >= TIER_RANK[required];
}
