'use client';

import type { ReactNode } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

/** Fixed inset for dialog body content (theme spacing units). */
export const ADMIN_DIALOG_BODY_PX = 3;
export const ADMIN_DIALOG_BODY_PT = 3;
export const ADMIN_DIALOG_BODY_PT_WITH_ICON = 3.5;

export type AdminDialogButton = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export type AdminDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Icon in the title bar (left of the title text). */
  headerIcon?: ReactNode;
  /** Content pinned to the footer left (e.g. `AdminDialogInfo`). */
  footerStart?: ReactNode;
  children: ReactNode;
  /** Centered icon above body content */
  icon?: ReactNode;
  /** Centered helper text below the icon */
  subtitle?: string;
  /** Custom footer; if set, `primaryButton` / `secondaryButton` are ignored */
  footer?: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  /** Footer button alignment */
  footerAlign?: 'start' | 'center' | 'end';
  /** Primary / secondary shortcuts — ignored if `footer` is set */
  primaryButton?: AdminDialogButton;
  secondaryButton?: AdminDialogButton;
  /** Hide divider between header and content */
  hideContentDividers?: boolean;
};

/**
 * Shared admin modal: dark overlay, titled header with close, optional centered icon, footer actions.
 */
export function AdminDialog({
  open,
  onClose,
  title,
  headerIcon,
  footerStart,
  children,
  icon,
  subtitle,
  footer,
  maxWidth = 'sm',
  footerAlign = 'end',
  primaryButton,
  secondaryButton,
  hideContentDividers = false,
}: AdminDialogProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primary = theme.palette.primary.main;
  const paperBase = theme.palette.background.paper;

  const dialogPaperSx = {
    borderRadius: 2.5,
    border: '1px solid',
    borderColor: alpha(primary, isDark ? 0.28 : 0.16),
    bgcolor: paperBase,
    boxShadow: isDark
      ? `0 24px 56px ${alpha('#000', 0.55)}, 0 0 0 1px ${alpha(primary, 0.1)}`
      : `0 24px 56px ${alpha(primary, 0.14)}, 0 0 0 1px ${alpha(primary, 0.08)}`,
    overflow: 'hidden',
  } as const;

  const backdropBase = isDark
    ? alpha('#05040a', 0.82)
    : alpha(theme.palette.background.default, 0.72);

  const backdropGradient = isDark
    ? `linear-gradient(145deg, ${alpha('#ffffff', 0.06)} 0%, ${alpha(primary, 0.42)} 38%, ${alpha('#05040a', 0.94)} 72%, ${alpha('#000000', 0.92)} 100%)`
    : `linear-gradient(145deg, ${alpha('#ffffff', 0.94)} 0%, ${alpha(primary, 0.2)} 40%, ${alpha(primary, 0.32)} 68%, ${alpha(primary, 0.14)} 100%)`;

  const justifyContent =
    footerAlign === 'center' ? 'center' : footerAlign === 'start' ? 'flex-start' : 'flex-end';

  const builtFooter =
    footer ??
    (primaryButton || secondaryButton || footerStart ? (
      <Stack direction="row" spacing={1} alignItems="center" width="100%">
        {footerStart ? <Box sx={{ flexShrink: 0 }}>{footerStart}</Box> : null}
        <Box sx={{ flex: 1, minWidth: 8 }} />
        <Stack direction="row" spacing={1} justifyContent={justifyContent} sx={{ flexShrink: 0 }}>
          {secondaryButton ? (
            <Button
              variant="outlined"
              onClick={secondaryButton.onClick}
              disabled={secondaryButton.disabled || secondaryButton.loading}
            >
              {secondaryButton.label}
            </Button>
          ) : null}
          {primaryButton ? (
            <Button
              variant="contained"
              onClick={primaryButton.onClick}
              disabled={primaryButton.disabled || primaryButton.loading}
            >
              {primaryButton.label}
            </Button>
          ) : null}
        </Stack>
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
            // Override MUI’s default dark scrim so light mode stays airy.
            backgroundColor: backdropBase,
            backgroundImage: backdropGradient,
            backdropFilter: 'blur(0.5px)',
          },
        },
      }}
      PaperProps={{
        elevation: 0,
        sx: dialogPaperSx,
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          pr: 1.5,
          pl: 2.5,
          py: 2,
          bgcolor: 'transparent',
          borderBottom: hideContentDividers ? 'none' : '1px solid',
          borderColor: alpha(primary, isDark ? 0.14 : 0.1),
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
          {headerIcon ? (
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                bgcolor: alpha(primary, isDark ? 0.18 : 0.1),
                color: 'primary.main',
                border: '1px solid',
                borderColor: alpha(primary, 0.16),
              }}
            >
              {headerIcon}
            </Box>
          ) : null}
          <Typography variant="h6" component="span" fontWeight={700} letterSpacing="-0.02em">
            {title}
          </Typography>
        </Stack>
        <IconButton
          aria-label="Close dialog"
          onClick={onClose}
          size="small"
          edge="end"
          sx={{ color: 'text.secondary' }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers={false}
        sx={{
          p: 0,
          bgcolor: 'transparent',
          borderBottom: builtFooter ? '1px solid' : 'none',
          borderColor: alpha(primary, isDark ? 0.14 : 0.1),
          // MUI zeros top padding when DialogContent follows DialogTitle — spacing is on the inner wrapper.
          '&.MuiDialogContent-root': {
            padding: 0,
          },
        }}
      >
        <Box
          sx={{
            px: ADMIN_DIALOG_BODY_PX,
            pt: icon || subtitle ? ADMIN_DIALOG_BODY_PT_WITH_ICON : ADMIN_DIALOG_BODY_PT,
            pb: ADMIN_DIALOG_BODY_PT,
          }}
        >
          {icon || subtitle ? (
            <Stack alignItems="center" textAlign="center" spacing={1.25} sx={{ mb: 2.5 }}>
              {icon ? (
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(
                      theme.palette.primary.main,
                      theme.palette.mode === 'dark' ? 0.18 : 0.1
                    ),
                    color: 'primary.main',
                  }}
                >
                  {icon}
                </Box>
              ) : null}
              {subtitle ? (
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
                  {subtitle}
                </Typography>
              ) : null}
            </Stack>
          ) : null}
          {children}
        </Box>
      </DialogContent>

      {builtFooter ? (
        <DialogActions
          sx={{
            px: ADMIN_DIALOG_BODY_PX,
            py: 2,
            justifyContent,
            bgcolor: 'transparent',
          }}
        >
          {builtFooter}
        </DialogActions>
      ) : null}
    </Dialog>
  );
}
