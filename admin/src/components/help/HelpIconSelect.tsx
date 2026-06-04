'use client';

import {
  Box,
  FormControl,
  InputLabel,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from '@mui/material';
import { HELP_ICON_OPTIONS } from '@/lib/help/helpIcons';
import { HelpIconGlyph } from '@/lib/help/helpIconGlyphs';

type HelpIconSelectProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  /** Narrow width for toolbar use. */
  compact?: boolean;
};

export function HelpIconSelect({
  value,
  onChange,
  label = 'Icon',
  disabled = false,
  compact = false,
}: Readonly<HelpIconSelectProps>) {
  return (
    <FormControl
      size="small"
      disabled={disabled}
      sx={{ minWidth: compact ? 148 : '100%', width: compact ? 148 : undefined }}
    >
      <InputLabel id="help-icon-select-label">{label}</InputLabel>
      <Select
        labelId="help-icon-select-label"
        label={label}
        value={value}
        onChange={(e: SelectChangeEvent) => onChange(e.target.value)}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HelpIconGlyph name={selected} fontSize="small" />
            {compact ? null : (
              <span>{HELP_ICON_OPTIONS.find((o) => o.value === selected)?.label ?? selected}</span>
            )}
          </Box>
        )}
      >
        {HELP_ICON_OPTIONS.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <HelpIconGlyph name={opt.value} fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={opt.label} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
