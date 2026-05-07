'use client';

import { Typography } from '@mui/material';
import { AdminDialog } from '@/components/ui/AdminDialog';

export type ConfirmArchiveDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
};

export function ConfirmArchiveDialog({
  open,
  title,
  description,
  confirmLabel = 'Archive',
  onCancel,
  onConfirm,
  loading,
}: ConfirmArchiveDialogProps) {
  return (
    <AdminDialog
      open={open}
      onClose={onCancel}
      title={title}
      maxWidth="xs"
      primaryButton={{
        label: confirmLabel,
        onClick: onConfirm,
        disabled: loading,
      }}
      secondaryButton={{ label: 'Cancel', onClick: onCancel, disabled: loading }}
    >
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </AdminDialog>
  );
}
