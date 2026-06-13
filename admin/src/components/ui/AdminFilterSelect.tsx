'use client';

import type { SxProps, Theme } from '@mui/material';
import { FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent } from '@mui/material';

export type AdminFilterOption<T extends string = string> = {
  value: T;
  label: string;
};

export type AdminFilterSelectProps<T extends string = string> = {
  value: T;
  onChange: (value: T) => void;
  options: readonly AdminFilterOption<T>[];
  /** Visible label above the select; omit for aria-only. */
  label?: string;
  'aria-label'?: string;
  disabled?: boolean;
  sx?: SxProps<Theme>;
  size?: 'small' | 'medium';
};

/**
 * Compact dropdown for list/table toolbar filters (pairs with `AdminSearchField`).
 */
export function AdminFilterSelect<T extends string>({
  value,
  onChange,
  options,
  label,
  'aria-label': ariaLabel,
  disabled = false,
  sx,
  size = 'small',
}: AdminFilterSelectProps<T>) {
  const labelId = label ? 'admin-filter-select-label' : undefined;

  function handleChange(e: SelectChangeEvent) {
    onChange(e.target.value as T);
  }

  return (
    <FormControl
      size={size}
      disabled={disabled}
      sx={{ minWidth: { xs: '100%', sm: 168 }, flexShrink: 0, ...sx }}
    >
      {label ? (
        <InputLabel id={labelId} shrink>
          {label}
        </InputLabel>
      ) : null}
      <Select
        labelId={labelId}
        label={label}
        value={value}
        onChange={handleChange}
        aria-label={ariaLabel ?? label ?? 'Filter'}
        displayEmpty={!label}
        notched={Boolean(label)}
        sx={{ bgcolor: 'background.paper' }}
      >
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
