'use client';

import type { AlertProps } from '@mui/material';
import { Alert } from '@mui/material';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

export type AdminFeedbackSeverity = 'error' | 'warning' | 'success' | 'info';

const FEEDBACK_ICONS = {
  error: ErrorOutlineRoundedIcon,
  warning: WarningAmberRoundedIcon,
  success: CheckCircleOutlineRoundedIcon,
  info: InfoOutlinedIcon,
} as const;

export type AdminFeedbackMessageProps = {
  severity: AdminFeedbackSeverity;
  message: string;
  onClose?: () => void;
  sx?: AlertProps['sx'];
};

/** Inline status banner for admin CRUD panels (error, warning, success, info). */
export function AdminFeedbackMessage({
  severity,
  message,
  onClose,
  sx,
}: AdminFeedbackMessageProps) {
  const Icon = FEEDBACK_ICONS[severity];

  return (
    <Alert
      severity={severity}
      icon={<Icon sx={{ fontSize: 20 }} />}
      onClose={onClose}
      sx={{ borderRadius: 2, alignItems: 'center', ...sx }}
    >
      {message}
    </Alert>
  );
}
