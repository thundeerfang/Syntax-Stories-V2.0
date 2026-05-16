'use client';

import { useCallback, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { useAuthDialogStore } from '@/store/authDialog';
import { postDataDeletionRequest } from '@/api/legal';
import {
  LEGAL_ACTION_BODY,
  LEGAL_ACTION_CTA_ROW,
  LEGAL_ACTION_KICKER,
  LEGAL_ACTION_PANEL,
  LEGAL_ACTION_TITLE,
  LEGAL_CARD_SECTION_RULE,
  LEGAL_MUTED_INLINE,
  LEGAL_PRIMARY_CTA,
  LEGAL_RETRO_ICON_TILE_TOC,
} from './legalUi';


export function UserDataDeletionPanel() {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const openAuth = useAuthDialogStore((s) => s.open);
  const [loading, setLoading] = useState(false);

  const onRequest = useCallback(async () => {
    if (!token) {
      openAuth('login');
      return;
    }
    setLoading(true);
    try {
      const idem = globalThis.crypto?.randomUUID?.() ?? `udd-${Date.now()}`;
      const res = await postDataDeletionRequest(token, {}, idem);
      toast.success('Deletion request submitted', {
        description: `Reference time: ${new Date(res.requestedAt).toLocaleString()}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [token, openAuth]);

  if (!isHydrated) {
    return (
      <div className={LEGAL_CARD_SECTION_RULE}>
        <div className={`${LEGAL_ACTION_PANEL} flex items-center gap-3`}>
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden />
          <p className={LEGAL_MUTED_INLINE}>Loading account state…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={LEGAL_CARD_SECTION_RULE}>
      <div className={LEGAL_ACTION_PANEL}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className={LEGAL_RETRO_ICON_TILE_TOC}>
            <ShieldAlert className="size-4 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className={LEGAL_ACTION_KICKER}>Your account</p>
            <h2 className={LEGAL_ACTION_TITLE}>Request data deletion</h2>
            <p className={LEGAL_ACTION_BODY}>
              Send a request from this signed-in account. We process it according to the policy above, including any
              subscription billing or legal-hold rules described there.
            </p>
          </div>
        </div>
        <div className={LEGAL_ACTION_CTA_ROW}>
          {!token ? (
            <button type="button" onClick={() => openAuth('login')} className={LEGAL_PRIMARY_CTA}>
              Sign in to request deletion
            </button>
          ) : (
            <button type="button" disabled={loading} onClick={() => void onRequest()} className={LEGAL_PRIMARY_CTA}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Request data deletion
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
