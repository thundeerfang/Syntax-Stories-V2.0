'use client';

import { useState, type ReactNode } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { AdminDialog } from '@/components/ui/AdminDialog';

export type AdminDialogInfoProps = {
  /** Tooltip on the info icon. */
  tooltip?: string;
  /** Title of the info dialog (defaults to "About"). */
  title?: string;
  children: ReactNode;
};

/** Info icon that opens a small shared-style admin dialog with help text. */
export function AdminDialogInfo({
  tooltip = 'More information',
  title = 'About',
  children,
}: AdminDialogInfoProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title={tooltip}>
        <IconButton
          size="small"
          aria-label={tooltip}
          onClick={() => setOpen(true)}
          sx={{ color: 'text.secondary' }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>
      <AdminDialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        maxWidth="xs"
        primaryButton={{ label: 'Got it', onClick: () => setOpen(false) }}
      >
        {children}
      </AdminDialog>
    </>
  );
}
