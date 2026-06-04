'use client';

import { useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import RestoreFromTrashRoundedIcon from '@mui/icons-material/RestoreFromTrashRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import {
  deleteBlogPost,
  restoreBlogPost,
  suspendBlogPost,
  unsuspendBlogPost,
} from '@/admin';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { AdminStatusBadge } from '@/components/ui/AdminStatusBadge';
import { ConfirmArchiveDialog } from '@/components/ui/ConfirmArchiveDialog';

type BlogModerationActionsProps = {
  token: string | null;
  postId: string;
  postTitle: string;
  status: 'draft' | 'published' | 'suspended';
  deletedAt: string | null;
  authorEmail?: string | null;
  onChanged?: () => void;
};

export function BlogModerationActions({
  token,
  postId,
  postTitle,
  status,
  deletedAt,
  authorEmail,
  onChanged,
}: BlogModerationActionsProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'suspend' | 'unsuspend' | 'delete' | 'restore' | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [confirmUnsuspend, setConfirmUnsuspend] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const isDeleted = Boolean(deletedAt);
  const isSuspended = status === 'suspended' && !isDeleted;

  async function onSuspend() {
    if (!token) return;
    setBusy('suspend');
    setError(null);
    try {
      await suspendBlogPost(token, postId);
      setConfirmSuspend(false);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to suspend post');
    } finally {
      setBusy(null);
    }
  }

  async function onUnsuspend() {
    if (!token) return;
    setBusy('unsuspend');
    setError(null);
    try {
      await unsuspendBlogPost(token, postId);
      setConfirmUnsuspend(false);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to unsuspend post');
    } finally {
      setBusy(null);
    }
  }

  async function onDelete() {
    if (!token) return;
    setBusy('delete');
    setError(null);
    try {
      await deleteBlogPost(token, postId);
      setConfirmDelete(false);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete post');
    } finally {
      setBusy(null);
    }
  }

  async function onRestore() {
    if (!token) return;
    setBusy('restore');
    setError(null);
    try {
      await restoreBlogPost(token, postId);
      setConfirmRestore(false);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to restore post');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Stack spacing={1.5}>
      {error ? (
        <AdminFeedbackMessage severity="error" message={error} onClose={() => setError(null)} />
      ) : null}

      <AdminBlinkSectionHeader
        title="Moderation"
        right={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            {isDeleted ? (
              <AdminStatusBadge label="In trash" tone="warning" />
            ) : isSuspended ? (
              <AdminStatusBadge label="Suspended" tone="warning" emphasis />
            ) : null}
            {isDeleted ? (
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<RestoreFromTrashRoundedIcon />}
                onClick={() => setConfirmRestore(true)}
                disabled={Boolean(busy)}
              >
                Restore
              </Button>
            ) : (
              <>
                {isSuspended ? (
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<CheckCircleRoundedIcon />}
                    onClick={() => setConfirmUnsuspend(true)}
                    disabled={Boolean(busy)}
                  >
                    Unsuspend
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    startIcon={<BlockRoundedIcon />}
                    onClick={() => setConfirmSuspend(true)}
                    disabled={Boolean(busy)}
                  >
                    Suspend
                  </Button>
                )}
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<DeleteOutlineRoundedIcon />}
                  onClick={() => setConfirmDelete(true)}
                  disabled={Boolean(busy)}
                >
                  Delete
                </Button>
              </>
            )}
          </Stack>
        }
      />

      <Typography variant="caption" color="text.secondary">
        {isDeleted
          ? 'This post is soft-deleted. Restore it here or from Soft delete. The author was emailed when it was deleted.'
          : isSuspended
            ? 'Suspended posts are hidden from the public; only the author can view them. Unsuspend to publish again, or delete to move to trash.'
            : 'Suspend hides the post from everyone except the author (email sent). Delete moves it to trash (email sent); restore stays on this page.'}
        {authorEmail ? ` Author: ${authorEmail}` : ''}
      </Typography>

      <ConfirmArchiveDialog
        open={confirmSuspend}
        title="Suspend this post?"
        description={`“${postTitle}” will be hidden from public feeds. Only the author can view it while signed in. They will receive an email.`}
        confirmLabel="Suspend"
        onCancel={() => setConfirmSuspend(false)}
        onConfirm={() => void onSuspend()}
        loading={busy === 'suspend'}
      />

      <ConfirmArchiveDialog
        open={confirmUnsuspend}
        title="Unsuspend this post?"
        description={`“${postTitle}” will return to draft or published depending on whether it was published before suspension.`}
        confirmLabel="Unsuspend"
        onCancel={() => setConfirmUnsuspend(false)}
        onConfirm={() => void onUnsuspend()}
        loading={busy === 'unsuspend'}
      />

      <ConfirmArchiveDialog
        open={confirmDelete}
        title="Delete this post?"
        description={`“${postTitle}” will be soft-deleted. The author will be emailed. You can restore it on this page without leaving.`}
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void onDelete()}
        loading={busy === 'delete'}
      />

      <ConfirmArchiveDialog
        open={confirmRestore}
        title="Restore this post?"
        description={`“${postTitle}” will be restored from trash and republished.`}
        confirmLabel="Restore"
        onCancel={() => setConfirmRestore(false)}
        onConfirm={() => void onRestore()}
        loading={busy === 'restore'}
      />
    </Stack>
  );
}
