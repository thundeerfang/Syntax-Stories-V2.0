import type { Request } from 'express';
import type { ProfileSections, ProfileUpdateSection } from '../../modules/profile/profile.types.js';

/**
 * In-process event bus (not Kafka). Listeners must not block the request path for heavy work.
 * Async listeners are fire-and-forget; errors are logged only.
 */
export type AuthSigninSuccessPayload = {
  userId: string;
  /** e.g. `google`, `otp`, `signup_email`, `2fa`, `qr_login` */
  source: string;
  isNewUser?: boolean;
};

/** Emitted after a successful profile persist; audit listener diffs sections. */
export type ReferralConvertedPayload = {
  referrerId: string;
  refereeUserId: string;
  source: string;
};

export type ProfileUpdatedPayload = {
  req: Request;
  actorId: string;
  updates: Record<string, unknown>;
  currentProfile: ProfileSections | null;
  updatedProfile: ProfileSections & { _id: unknown };
  /** `legacy` = monolithic `PATCH /auth/profile`; otherwise the section route used. */
  section: ProfileUpdateSection | 'legacy';
};

export type AppEventMap = {
  /** Successful sign-in after session + JWT issuance (email OTP, OAuth, etc.). */
  'auth.signin.success': AuthSigninSuccessPayload;
  /** Referral attributed on new user (post-DB conditional update). */
  'referral.converted': ReferralConvertedPayload;
  /** Profile document updated (post-DB write). */
  'profile.updated': ProfileUpdatedPayload;
};

type Listener<K extends keyof AppEventMap> = (payload: AppEventMap[K]) => void | Promise<void>;

const listeners = new Map<keyof AppEventMap, Set<Listener<keyof AppEventMap>>>();

export function onAppEvent<K extends keyof AppEventMap>(event: K, fn: Listener<K>): () => void {
  let set = listeners.get(event);
  if (!set) {
    set = new Set();
    listeners.set(event, set);
  }
  set.add(fn as Listener<keyof AppEventMap>);
  return () => {
    set?.delete(fn as Listener<keyof AppEventMap>);
  };
}

export function emitAppEvent<K extends keyof AppEventMap>(event: K, payload: AppEventMap[K]): void {
  const set = listeners.get(event);
  if (!set?.size) return;
  for (const fn of set) {
    try {
      void Promise.resolve(fn(payload)).catch((e) => console.error('[appEvents]', String(event), e));
    } catch (e) {
      console.error('[appEvents]', String(event), e);
    }
  }
}
