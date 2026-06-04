'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';

const OTP_LENGTH = 6;

export type AdminOtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  /** Fired once when all digits are entered (paste or typing). */
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: boolean;
  helperText?: string;
  'aria-label'?: string;
};

function digitsFromValue(value: string): string[] {
  const chars = value.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
  while (chars.length < OTP_LENGTH) chars.push('');
  return chars;
}

function lastFilledIndex(digits: string[]): number {
  for (let i = digits.length - 1; i >= 0; i--) {
    if (digits[i]) return i;
  }
  return -1;
}

export function AdminOtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = false,
  error = false,
  helperText,
  'aria-label': ariaLabel = 'One-time code',
}: AdminOtpInputProps) {
  const theme = useTheme();
  const groupId = useId();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = digitsFromValue(value);
  const completedRef = useRef<string | null>(null);
  const didInitialAutoFocus = useRef(false);
  const prevError = useRef(error);
  const prevDisabled = useRef(disabled);

  const emit = useCallback(
    (nextDigits: string[]) => {
      const next = nextDigits.join('').replace(/\D/g, '').slice(0, OTP_LENGTH);
      onChange(next);
      if (next.length === OTP_LENGTH && completedRef.current !== next) {
        completedRef.current = next;
        onComplete?.(next);
      }
      if (next.length < OTP_LENGTH) {
        completedRef.current = null;
      }
    },
    [onChange, onComplete]
  );

  const focusIndex = useCallback((index: number) => {
    const i = Math.max(0, Math.min(index, OTP_LENGTH - 1));
    inputRefs.current[i]?.focus();
    inputRefs.current[i]?.select();
  }, []);

  // Only autofocus once on mount — not when `disabled` flips after failed submit.
  useEffect(() => {
    if (autoFocus && !disabled && !didInitialAutoFocus.current) {
      didInitialAutoFocus.current = true;
      const t = window.setTimeout(() => focusIndex(0), 0);
      return () => window.clearTimeout(t);
    }
  }, [autoFocus, disabled, focusIndex]);

  // After a failed full code, park caret on the last box (e.g. when loading ends).
  useEffect(() => {
    const len = value.replace(/\D/g, '').length;
    const errorJustOn = error && !prevError.current;
    const reEnabled = prevDisabled.current && !disabled;
    prevError.current = error;
    prevDisabled.current = disabled;

    if (!error || disabled || len < OTP_LENGTH) return;
    if (!errorJustOn && !reEnabled) return;

    const t = window.setTimeout(() => focusIndex(OTP_LENGTH - 1), 0);
    return () => window.clearTimeout(t);
  }, [error, disabled, value, focusIndex]);

  function applyDigits(nextDigits: string[], focusAt?: number) {
    emit(nextDigits);
    if (focusAt != null) focusIndex(focusAt);
  }

  function handleDigitChange(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, '');
    const next = [...digits];

    if (cleaned.length > 1) {
      for (let i = 0; i < cleaned.length && index + i < OTP_LENGTH; i++) {
        next[index + i] = cleaned[i] ?? '';
      }
      const last = Math.min(index + cleaned.length, OTP_LENGTH - 1);
      applyDigits(next, last);
      return;
    }

    next[index] = cleaned.slice(-1);
    applyDigits(next, cleaned && index < OTP_LENGTH - 1 ? index + 1 : index);
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      const last = lastFilledIndex(next);
      if (last < 0) return;

      // Full code: always peel from the end (even if focus landed on an earlier box).
      if (last === OTP_LENGTH - 1) {
        next[last] = '';
        applyDigits(next, last);
        return;
      }

      if (next[index]) {
        next[index] = '';
        applyDigits(next, index);
      } else if (index > 0) {
        const prev = index - 1;
        if (next[prev]) {
          next[prev] = '';
          applyDigits(next, prev);
        }
      }
      return;
    }

    if (e.key === 'Delete') {
      e.preventDefault();
      const next = [...digits];
      next[index] = '';
      applyDigits(next, index);
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusIndex(index - 1);
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusIndex(index + 1);
      return;
    }

    if (e.key === 'Enter' && value.replace(/\D/g, '').length === OTP_LENGTH) {
      onComplete?.(value.replace(/\D/g, '').slice(0, OTP_LENGTH));
    }
  }

  function handlePaste(index: number, e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const next = [...digits];
    for (let i = 0; i < pasted.length && index + i < OTP_LENGTH; i++) {
      next[index + i] = pasted[i] ?? '';
    }
    const focusAt = Math.min(index + pasted.length, OTP_LENGTH) - 1;
    applyDigits(next, Math.max(focusAt, 0));
  }

  const borderColor = error
    ? theme.palette.error.main
    : alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.35 : 0.25);

  return (
    <Box>
      <Box
        role="group"
        aria-label={ariaLabel}
        id={groupId}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: { xs: 0.75, sm: 1 },
        }}
      >
        {digits.map((digit, index) => (
          <Box
            key={index}
            component="input"
            ref={(el: HTMLInputElement | null) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            autoFocus={autoFocus && index === 0}
            disabled={disabled}
            value={digit}
            maxLength={1}
            aria-label={`${ariaLabel} digit ${index + 1} of ${OTP_LENGTH}`}
            onChange={(e) => handleDigitChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={(e) => handlePaste(index, e)}
            onFocus={(e) => e.currentTarget.select()}
            sx={{
              width: { xs: 40, sm: 44 },
              height: { xs: 48, sm: 52 },
              p: 0,
              textAlign: 'center',
              fontSize: '1.25rem',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              borderRadius: 1.5,
              border: '1px solid',
              borderColor,
              bgcolor: 'background.paper',
              color: 'text.primary',
              outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              '&:focus': {
                borderColor: error ? 'error.main' : 'primary.main',
                boxShadow: `0 0 0 3px ${alpha(
                  error ? theme.palette.error.main : theme.palette.primary.main,
                  0.22
                )}`,
              },
              '&:disabled': {
                opacity: 0.55,
                cursor: 'not-allowed',
              },
            }}
          />
        ))}
      </Box>
      {helperText ? (
        <Typography
          variant="caption"
          color={error ? 'error' : 'text.secondary'}
          display="block"
          textAlign="center"
          sx={{ mt: 1.25 }}
        >
          {helperText}
        </Typography>
      ) : null}
    </Box>
  );
}
