'use client';

import type { ReactNode } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { AdminDialog, type AdminDialogButton } from '@/components/ui/AdminDialog';

export const ADMIN_SPLIT_PREVIEW_PANEL_HEIGHT = 360;

export type AdminSplitPreviewDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  headerIcon?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  panelHeight?: number;
  /** Messages above the split panels (errors, warnings). */
  feedback?: ReactNode;
  /** Label above the input column. */
  inputLabel?: string;
  /** Hint below input label. */
  inputHint?: ReactNode;
  /** Left column — wrapped in a scrollable panel. */
  inputPanel: ReactNode;
  previewTitle?: string;
  previewCount?: number;
  previewEmptyMessage?: string;
  /** Right column body — wrapped in a scrollable panel. */
  previewContent: ReactNode;
  /** Footer left slot (e.g. template info icon). */
  footerStart?: ReactNode;
  primaryButton: AdminDialogButton;
  secondaryButton?: AdminDialogButton;
};

function ScrollPanel({
  children,
  minHeight,
}: Readonly<{ children: ReactNode; minHeight: number }>) {
  return (
    <Paper
      variant="outlined"
      sx={{
        flex: 1,
        minHeight: 0,
        height: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </Box>
    </Paper>
  );
}

/**
 * Two-column admin dialog: scrollable input on the left, scrollable preview on the right.
 */
export function AdminSplitPreviewDialog({
  open,
  onClose,
  title,
  headerIcon,
  maxWidth = 'md',
  panelHeight = ADMIN_SPLIT_PREVIEW_PANEL_HEIGHT,
  feedback,
  inputLabel = 'Input',
  inputHint,
  inputPanel,
  previewTitle = 'Preview',
  previewCount,
  previewEmptyMessage = 'Nothing to preview yet.',
  previewContent,
  footerStart,
  primaryButton,
  secondaryButton,
}: Readonly<AdminSplitPreviewDialogProps>) {
  const previewHeading =
    previewCount !== undefined && previewCount > 0
      ? `${previewTitle} (${previewCount})`
      : previewTitle;

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title={title}
      headerIcon={headerIcon}
      maxWidth={maxWidth}
      footerStart={footerStart}
      primaryButton={primaryButton}
      secondaryButton={secondaryButton ?? { label: 'Cancel', onClick: onClose, disabled: primaryButton.loading }}
    >
      <Stack spacing={2}>
        {feedback}

        <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
          <Grid
            size={{ xs: 12, md: 6 }}
            sx={{ display: 'flex', flexDirection: 'column', minHeight: panelHeight, maxHeight: panelHeight }}
          >
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>
              {inputLabel}
            </Typography>
            {inputHint ? (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                {inputHint}
              </Typography>
            ) : null}
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
              <ScrollPanel minHeight={panelHeight - (inputHint ? 52 : 36)}>{inputPanel}</ScrollPanel>
            </Box>
          </Grid>

          <Grid
            size={{ xs: 12, md: 6 }}
            sx={{ display: 'flex', flexDirection: 'column', minHeight: panelHeight, maxHeight: panelHeight }}
          >
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              {previewHeading}
            </Typography>
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
              <ScrollPanel minHeight={panelHeight - 28}>
                {previewContent ?? (
                  <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%' }}>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      {previewEmptyMessage}
                    </Typography>
                  </Box>
                )}
              </ScrollPanel>
            </Box>
          </Grid>
        </Grid>
      </Stack>
    </AdminDialog>
  );
}
