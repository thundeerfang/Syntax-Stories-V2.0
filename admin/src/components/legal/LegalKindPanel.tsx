'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Stack } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import type { LegalPolicyKind, LegalPolicyRecord } from '@/lib/api/legalAdmin';
import {
  deleteLegalRevision,
  listLegalRevisions,
  patchLegalPolicy,
} from '@/lib/api/legalAdmin';
import { buildLegalDocumentRows } from '@/lib/legal/buildLegalDocumentRows';
import { LEGAL_KIND_LABEL } from '@/lib/legal/legalLabels';
import { legalDraftPath } from '@/lib/legal/legalPaths';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { ConfirmArchiveDialog } from '@/components/ui/ConfirmArchiveDialog';
import { legalRevisionsColumns } from './legalRevisionsColumns';

export function LegalKindPanel({
  kind,
  apiToken,
  policy: policyProp,
  onPolicyChange,
}: {
  kind: LegalPolicyKind;
  apiToken: string | null;
  policy?: LegalPolicyRecord | null;
  onPolicyChange?: () => void;
}) {
  const router = useRouter();
  const [policy, setPolicy] = useState<LegalPolicyRecord | null>(policyProp ?? null);
  const [rows, setRows] = useState<ReturnType<typeof buildLegalDocumentRows>>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteRevisionId, setDeleteRevisionId] = useState<string | null>(null);

  useEffect(() => {
    setPolicy(policyProp ?? null);
  }, [policyProp]);

  const refreshRevisions = useCallback(
    async (p: LegalPolicyRecord) => {
      if (!apiToken) return;
      setLoadingRevisions(true);
      setError(null);
      try {
        const revs = await listLegalRevisions(apiToken, p._id);
        setRows(buildLegalDocumentRows(p, revs));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load revisions');
        setRows([]);
      } finally {
        setLoadingRevisions(false);
      }
    },
    [apiToken]
  );

  useEffect(() => {
    if (!policy) {
      setRows([]);
      return;
    }
    void refreshRevisions(policy);
  }, [policy, refreshRevisions]);

  const hasWorkingDraft =
    policy?.status === 'draft' ||
    policy?.status === 'in_review' ||
    policy?.status === 'approved';

  async function onCreateNew() {
    if (!apiToken || !policy) return;
    setBusyId('create');
    setError(null);
    try {
      if (hasWorkingDraft) {
        router.push(legalDraftPath(kind));
        return;
      }
      const updated = await patchLegalPolicy(apiToken, policy._id, { action: 'start_draft' });
      setPolicy(updated);
      onPolicyChange?.();
      await refreshRevisions(updated);
      router.push(legalDraftPath(kind));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start draft');
    } finally {
      setBusyId(null);
    }
  }

  async function onDeleteRevision(revisionId: string) {
    if (!apiToken || !policy) return;
    setBusyId(revisionId);
    setError(null);
    try {
      await deleteLegalRevision(apiToken, policy._id, revisionId);
      setDeleteRevisionId(null);
      onPolicyChange?.();
      await refreshRevisions(policy);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  }

  async function onDiscardDraft() {
    if (!apiToken || !policy) return;
    setBusyId('draft');
    setError(null);
    try {
      const updated = await patchLegalPolicy(apiToken, policy._id, { action: 'discard_draft' });
      setDiscardOpen(false);
      setPolicy(updated);
      onPolicyChange?.();
      await refreshRevisions(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Discard failed');
    } finally {
      setBusyId(null);
    }
  }

  const columns = useMemo(
    () =>
      legalRevisionsColumns({
        kind,
        busyId,
        onDiscardDraft: () => setDiscardOpen(true),
        onDeleteRevision: (id) => setDeleteRevisionId(id),
      }),
    [kind, busyId]
  );

  return (
    <Stack spacing={2}>
      {error ? (
        <AdminFeedbackMessage severity="error" message={error} onClose={() => setError(null)} />
      ) : null}

      <AdminBlinkSectionHeader
        title={`${LEGAL_KIND_LABEL[kind]} versions`}
        right={
          <Button
            variant="contained"
            size="small"
            startIcon={<AddRoundedIcon />}
            disabled={Boolean(busyId) || loadingRevisions || !policy}
            onClick={() => void onCreateNew()}
          >
            {hasWorkingDraft ? 'Continue draft' : 'Create new version'}
          </Button>
        }
      />

      <AdminDataTable
        data={rows}
        columns={columns}
        loading={loadingRevisions || !policy}
        getRowId={(row) => row.id}
        emptyMessage="No versions yet. Create a new version to start drafting."
        totalLabel="versions"
        pageSize={10}
        dense
      />

      <ConfirmArchiveDialog
        open={discardOpen}
        title="Discard working draft?"
        description="This restores the live published content and removes the in-progress draft. This cannot be undone."
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => void onDiscardDraft()}
        loading={busyId === 'draft'}
      />

      <ConfirmArchiveDialog
        open={Boolean(deleteRevisionId)}
        title="Delete past revision?"
        description="This permanently removes a superseded revision from history. The live published version is not affected."
        onCancel={() => setDeleteRevisionId(null)}
        onConfirm={() => deleteRevisionId && void onDeleteRevision(deleteRevisionId)}
        loading={Boolean(busyId && deleteRevisionId && busyId === deleteRevisionId)}
      />
    </Stack>
  );
}
