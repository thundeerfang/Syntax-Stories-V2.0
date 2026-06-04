'use client';

import type { SxProps, Theme } from '@mui/material';
import { InputAdornment, TextField, type TextFieldProps } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

export type AdminSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Shown when `label` is set; defaults to placeholder. */
  label?: string;
  'aria-label'?: string;
  sx?: SxProps<Theme>;
  size?: TextFieldProps['size'];
};

/**
 * Standard admin search input — icon on the left, used in list/table toolbars.
 */
export function AdminSearchField({
  value,
  onChange,
  placeholder = 'Search…',
  disabled = false,
  label,
  'aria-label': ariaLabel,
  sx,
  size = 'small',
}: AdminSearchFieldProps) {
  return (
    <TextField
      size={size}
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={ariaLabel ?? label ?? placeholder}
      sx={{ minWidth: { xs: '100%', sm: 280 }, maxWidth: 420, ...sx }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start" sx={{ mr: 0.25 }}>
              <SearchRoundedIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
