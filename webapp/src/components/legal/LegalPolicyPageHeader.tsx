'use client';

import { usePathname } from 'next/navigation';
import { FileText } from 'lucide-react';
import { useLegalPolicyHeaderSnapshot } from './LegalPolicyHeaderContext';
import {
  LEGAL_HEADER_SUMMARY,
  LEGAL_MONO_KICKER,
  LEGAL_MONO_PAGE_TITLE,
  LEGAL_RETRO_CARD,
  LEGAL_RETRO_ICON_TILE_HEADER,
  LEGAL_ROUTE_HEADER_WRAP,
  LEGAL_VERSION_BADGE,
  LEGAL_VERSION_BADGE_LINE_MUTED,
  LEGAL_VERSION_BADGE_LINE_PRIMARY,
} from './legalUi';

const PATH_KICKER: Record<string, string> = {
  '/terms': 'Legal · Terms',
  '/privacy': 'Legal · Privacy',
  '/user-data-deletion': 'Legal · UDD',
};

const PATH_FALLBACK_TITLE: Record<string, string> = {
  '/terms': 'Terms of Service',
  '/privacy': 'Privacy Policy',
  '/user-data-deletion': 'User Data Deletion',
};

function normalizePath(p: string): string {
  if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1);
  return p;
}

export function LegalPolicyPageHeader() {
  const pathname = normalizePath(usePathname() ?? '');
  const snapshot = useLegalPolicyHeaderSnapshot();
  const kicker = PATH_KICKER[pathname] ?? 'Syntax Stories';
  const title = snapshot?.title ?? PATH_FALLBACK_TITLE[pathname] ?? 'Legal';
  const summary = snapshot?.summary ?? null;
  const versionLines = snapshot?.versionBadgeLines ?? null;
  const versionAria = snapshot?.versionAriaLabel ?? null;

  return (
    <header className={`${LEGAL_RETRO_CARD} ${LEGAL_ROUTE_HEADER_WRAP}`}>
      <div
        className={
          versionLines?.length
            ? 'grid w-full grid-cols-1 gap-y-4 gap-x-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-x-8'
            : 'flex w-full flex-col gap-4'
        }
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className={LEGAL_RETRO_ICON_TILE_HEADER}>
            <FileText className="size-5 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 pt-0.5">
            <p className={LEGAL_MONO_KICKER}>{kicker}</p>
            <h1 className={LEGAL_MONO_PAGE_TITLE}>{title}</h1>
            {summary ? <p className={LEGAL_HEADER_SUMMARY}>{summary}</p> : null}
          </div>
        </div>
        {versionLines?.length ? (
          <div
            className={`${LEGAL_VERSION_BADGE} lg:self-start`}
            role="group"
            aria-label={versionAria ?? 'Policy version'}
          >
            {versionLines.map((line, i) => (
              <p key={line} className={i === 0 ? LEGAL_VERSION_BADGE_LINE_PRIMARY : LEGAL_VERSION_BADGE_LINE_MUTED}>
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}
