'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';
import type { PublishedPolicyResponse } from '@contracts/legalApi';
import { formatLegalPolicyVersionMeta, getLegalPolicyVersionBadgeLines } from './legalPolicyFormat';

export type LegalPolicyHeaderSnapshot = {
  title: string;
  summary: string | null;
  /** Stacked badge lines: version, then published / effective. */
  versionBadgeLines: string[];
  versionAriaLabel: string;
};

type Ctx = {
  snapshot: LegalPolicyHeaderSnapshot | null;
  setSnapshot: (v: LegalPolicyHeaderSnapshot | null) => void;
};

const LegalPolicyHeaderContext = createContext<Ctx | null>(null);

export function LegalPolicyHeaderProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<LegalPolicyHeaderSnapshot | null>(null);
  const value = useMemo(() => ({ snapshot, setSnapshot }), [snapshot]);
  return (
    <LegalPolicyHeaderContext.Provider value={value}>{children}</LegalPolicyHeaderContext.Provider>
  );
}

/** Header reads optional snapshot (null when no policy mounted or outside provider). */
export function useLegalPolicyHeaderSnapshot(): LegalPolicyHeaderSnapshot | null {
  return useContext(LegalPolicyHeaderContext)?.snapshot ?? null;
}

/** Pushes published policy fields into the shell header; clears on unmount. */
export function LegalPolicyHeaderPublisher({ data }: { data: PublishedPolicyResponse }) {
  // Do not depend on the full context value: provider memoizes `{ snapshot, setSnapshot }` with
  // `[snapshot]`, so the object identity changes after every setSnapshot → infinite useLayoutEffect loop.
  const setSnapshot = useContext(LegalPolicyHeaderContext)?.setSnapshot;

  // useLayoutEffect: apply snapshot before paint so the version line does not flash in after paint.
  useLayoutEffect(() => {
    if (!setSnapshot) return;
    const summary = data.summary?.trim() ? data.summary.trim() : null;
    setSnapshot({
      title: data.title,
      summary,
      versionBadgeLines: getLegalPolicyVersionBadgeLines(data),
      versionAriaLabel: formatLegalPolicyVersionMeta(data),
    });
    return () => setSnapshot(null);
  }, [setSnapshot, data]);

  return null;
}
