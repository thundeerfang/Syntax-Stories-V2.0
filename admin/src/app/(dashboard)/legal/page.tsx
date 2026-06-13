'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Stack } from '@mui/material';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import PolicyRoundedIcon from '@mui/icons-material/PolicyRounded';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { pageBreadcrumbs } from '@/components/layout/pageHeaderBreadcrumbs';
import { AdminTabs } from '@/components/ui/AdminTabs';
import { LegalSummaryCards } from '@/components/legal/LegalSummaryCards';
import { LegalKindPanel } from '@/components/legal/LegalKindPanel';
import { LEGAL_TAB_KEYS, isLegalPolicyKind } from '@/lib/legal/legalLabels';
import type { LegalPolicyKind } from '@/lib/api/legalAdmin';
import { bootstrapLegalPolicies, listLegalPolicies, type LegalPolicyRecord } from '@/lib/api/legalAdmin';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';

const LEGAL_TABS = [
  { label: 'Terms & Conditions', icon: DescriptionRoundedIcon },
  { label: 'Privacy Policy', icon: PolicyRoundedIcon },
  { label: 'User Data Deletion', icon: DeleteForeverRoundedIcon },
] as const;

function tabFromQuery(raw: string | null): LegalPolicyKind {
  if (raw && isLegalPolicyKind(raw)) return raw;
  return 'terms';
}

function LegalPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);

  const [tab, setTab] = useState<LegalPolicyKind>(() => tabFromQuery(searchParams.get('tab')));
  const [policies, setPolicies] = useState<LegalPolicyRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPolicies = useCallback(async () => {
    if (!apiToken) return;
    setLoading(true);
    setError(null);
    try {
      let items = await listLegalPolicies(apiToken);
      const hasAllKinds = LEGAL_TAB_KEYS.every((k) => items.some((p) => p.kind === k));
      if (!hasAllKinds) {
        items = await bootstrapLegalPolicies(apiToken);
      }
      setPolicies(items);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load legal policies';
      setError(
        msg.includes('404')
          ? `${msg} — restart the API server and confirm your account has legal:manage permission.`
          : msg
      );
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, [apiToken]);

  useEffect(() => {
    setTab(tabFromQuery(searchParams.get('tab')));
  }, [searchParams]);

  useEffect(() => {
    void loadPolicies();
  }, [loadPolicies]);

  const setTabAndUrl = useCallback(
    (next: LegalPolicyKind) => {
      setTab(next);
      const q = next === 'terms' ? '' : `?tab=${next}`;
      router.replace(`${pathname ?? '/legal'}${q}`, { scroll: false });
    },
    [router, pathname]
  );

  const tabIndex = LEGAL_TAB_KEYS.indexOf(tab);
  const policyForTab = policies.find((p) => p.kind === tab) ?? null;

  return (
    <Stack spacing={3}>
      <CentricPageHeader
        title="Legal"
        description="Manage Terms & Conditions, Privacy Policy, and User Data Deletion documents shown to users."
        icon={<GavelRoundedIcon />}
        breadcrumbs={pageBreadcrumbs('Legal', '/legal')}
      />

      {error ? (
        <AdminFeedbackMessage severity="error" message={error} onClose={() => setError(null)} />
      ) : null}

      <LegalSummaryCards policies={policies} />

      <AdminTabs
        tabs={[...LEGAL_TABS]}
        value={tabIndex >= 0 ? tabIndex : 0}
        onChange={(v) => setTabAndUrl(LEGAL_TAB_KEYS[v] ?? 'terms')}
      >
        <LegalKindPanel
          kind={tab}
          apiToken={apiToken}
          policy={policyForTab}
          onPolicyChange={() => void loadPolicies()}
        />
      </AdminTabs>

    </Stack>
  );
}

export default function LegalPage() {
  return (
    <Suspense
      fallback={
        <Stack spacing={3}>
          <CentricPageHeader
            title="Legal"
            description="Manage Terms & Conditions, Privacy Policy, and User Data Deletion documents."
            icon={<GavelRoundedIcon />}
            breadcrumbs={pageBreadcrumbs('Legal', '/legal')}
          />
        </Stack>
      }
    >
      <LegalPageInner />
    </Suspense>
  );
}
