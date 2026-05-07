'use client';

import type { ReactNode } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

export type AdminDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Custom footer; if omitted and no actions, no footer row is shown */
  footer?: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  /** Primary / secondary shortcuts — ignored if `footer` is set */
  primaryButton?: { label: string; onClick: () => void; disabled?: boolean };
  secondaryButton?: { label: string; onClick: () => void; disabled?: boolean };
};

/**
 * Shared admin modal: dark overlay, header with close, optional action buttons.
 */
export function AdminDialog({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'sm',
  primaryButton,
  secondaryButton,
}: AdminDialogProps) {
  const builtFooter =
    footer ??
    (primaryButton || secondaryButton ? (
      <Stack direction="row" spacing={1} justifyContent="flex-end" width="100%">
        {secondaryButton ? (
          <Button variant="outlined" onClick={secondaryButton.onClick} disabled={secondaryButton.disabled}>
            {secondaryButton.label}
          </Button>
        ) : null}
        {primaryButton ? (
          <Button variant="contained" onClick={primaryButton.onClick} disabled={primaryButton.disabled}>
            {primaryButton.label}
          </Button>
        ) : null}
      </Stack>
    ) : null);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
          },
        },
      }}
      PaperProps={{
        elevation: 8,
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          pr: 1,
          py: 2,
        }}
      >
        <Typography variant="h6" component="span" fontWeight={800} className="tracking-tight">
          {title}
        </Typography>
        <IconButton aria-label="Close dialog" onClick={onClose} size="small" edge="end">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2 }}>
        {children}
      </DialogContent>
      {builtFooter ? <DialogActions sx={{ px: 3, py: 2 }}>{builtFooter}</DialogActions> : null}
    </Dialog>
  );
}
