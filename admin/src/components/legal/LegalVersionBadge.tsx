'use client';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import TagRoundedIcon from '@mui/icons-material/TagRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import { AdminStatusBadge } from '@/components/ui/AdminStatusBadge';
import type { LegalDocumentPhase } from '@/lib/legal/buildLegalDocumentRows';

export function LegalPublishedBadge({ emphasis = true }: { emphasis?: boolean }) {
  return (
    <AdminStatusBadge
      label="Published"
      tone="success"
      emphasis={emphasis}
      icon={<CheckCircleRoundedIcon fontSize="inherit" />}
    />
  );
}

export function LegalVersionBadge({ version }: { version: number }) {
  return (
    <AdminStatusBadge
      label={`v${version}`}
      tone="primary"
      icon={<TagRoundedIcon fontSize="inherit" />}
    />
  );
}

export function LegalPhaseBadge({
  phase,
}: {
  phase: LegalDocumentPhase;
}) {
  if (phase === 'current') {
    return (
      <AdminStatusBadge
        label="Current"
        tone="success"
        emphasis
        icon={<CheckCircleRoundedIcon fontSize="inherit" />}
      />
    );
  }
  if (phase === 'draft') {
    return (
      <AdminStatusBadge
        label="Draft"
        tone="warning"
        icon={<EditNoteRoundedIcon fontSize="inherit" />}
      />
    );
  }
  return (
    <AdminStatusBadge
      label="Past"
      tone="neutral"
      icon={<HistoryRoundedIcon fontSize="inherit" />}
    />
  );
}

export function LegalRevisionStatusBadge({
  status,
  phase,
}: {
  status: string;
  phase: LegalDocumentPhase;
}) {
  const normalized = status.replace(/_/g, ' ');

  if (status === 'published' || phase === 'current') {
    return (
      <AdminStatusBadge
        label="Published"
        tone="success"
        emphasis={phase === 'current'}
        icon={<CheckCircleRoundedIcon fontSize="inherit" />}
      />
    );
  }
  if (status === 'superseded') {
    return (
      <AdminStatusBadge
        label="Superseded"
        tone="neutral"
        icon={<HistoryRoundedIcon fontSize="inherit" />}
      />
    );
  }
  if (status === 'approved') {
    return (
      <AdminStatusBadge
        label="Approved"
        tone="info"
        icon={<VerifiedRoundedIcon fontSize="inherit" />}
      />
    );
  }
  if (status === 'in_review') {
    return (
      <AdminStatusBadge
        label="In review"
        tone="info"
        icon={<RateReviewRoundedIcon fontSize="inherit" />}
      />
    );
  }
  return (
    <AdminStatusBadge
      label={normalized}
      tone="warning"
      icon={<EditNoteRoundedIcon fontSize="inherit" />}
    />
  );
}

export function LegalDocumentStatusBadge({
  status,
  version,
}: {
  status: string;
  version?: number | null;
}) {
  const normalized = status.replace(/_/g, ' ');
  if (status === 'published') {
    return (
      <>
        <LegalPublishedBadge />
        {version != null ? <LegalVersionBadge version={version} /> : null}
      </>
    );
  }
  if (status === 'superseded') {
    return (
      <>
        <AdminStatusBadge
          label="Past"
          tone="neutral"
          icon={<HistoryRoundedIcon fontSize="inherit" />}
        />
        {version != null ? <LegalVersionBadge version={version} /> : null}
      </>
    );
  }
  return (
    <>
      <AdminStatusBadge
        label={normalized}
        tone="warning"
        icon={<EditNoteRoundedIcon fontSize="inherit" />}
      />
      {version != null ? <LegalVersionBadge version={version} /> : null}
    </>
  );
}
