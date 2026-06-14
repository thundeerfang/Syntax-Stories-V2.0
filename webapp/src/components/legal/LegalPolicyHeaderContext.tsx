"use client";
import type { ReactNode } from "react";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import type { PublishedPolicyResponse } from "@contracts/legalApi";
import {
  formatLegalPolicyVersionMeta,
  getLegalPolicyVersionBadgeLines,
} from "./legalPolicyFormat";
export type LegalPolicyHeaderSnapshot = {
  title: string;
  summary: string | null;
  versionBadgeLines: string[];
  versionAriaLabel: string;
};
type Ctx = {
  snapshot: LegalPolicyHeaderSnapshot | null;
  setSnapshot: (v: LegalPolicyHeaderSnapshot | null) => void;
};
const LegalPolicyHeaderContext = createContext<Ctx | null>(null);
export function LegalPolicyHeaderProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<LegalPolicyHeaderSnapshot | null>(
    null,
  );
  const value = useMemo(() => ({ snapshot, setSnapshot }), [snapshot]);
  return (
    <LegalPolicyHeaderContext.Provider value={value}>
      {children}
    </LegalPolicyHeaderContext.Provider>
  );
}
export function useLegalPolicyHeaderSnapshot(): LegalPolicyHeaderSnapshot | null {
  return useContext(LegalPolicyHeaderContext)?.snapshot ?? null;
}
export function LegalPolicyHeaderPublisher({
  data,
}: {
  data: PublishedPolicyResponse;
}) {
  const setSnapshot = useContext(LegalPolicyHeaderContext)?.setSnapshot;
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
