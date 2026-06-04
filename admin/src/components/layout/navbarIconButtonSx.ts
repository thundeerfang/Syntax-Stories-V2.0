import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

export function navbarIconButtonSx(theme: Theme) {
  return {
    color: 'text.secondary',
    bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.12 : 0.08),
    '&:hover': {
      bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.2 : 0.14),
    },
  };
}
