'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { resolvePublicApiBase } from '@/lib/publicApiBase';

/**
 * Sets `pendingReferralCode` in sessionStorage (backup for verify body) and redirects to the API
 * attach endpoint so the signed `ss_ref` cookie is set on the API origin.
 */
export default function InviteLandingPage() {
  const params = useParams();
  const code = typeof params?.code === 'string' ? decodeURIComponent(params.code) : '';

  useEffect(() => {
    const trimmed = code.trim();
    if (!trimmed) {
      globalThis.location?.replace('/');
      return;
    }
    const normalized = trimmed.toUpperCase();
    try {
      globalThis.sessionStorage?.setItem('pendingReferralCode', normalized);
    } catch {
      /* ignore */
    }
    const api = resolvePublicApiBase();
    if (!api) {
      globalThis.location?.replace('/');
      return;
    }
    const next = encodeURIComponent('/');
    globalThis.location.href = `${api}/api/invites/attach?code=${encodeURIComponent(normalized)}&next=${next}`;
  }, [code]);

  return (
    <p style={{ padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      Taking you to Syntax Stories…
    </p>
  );
}
