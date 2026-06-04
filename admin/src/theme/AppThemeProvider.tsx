'use client';

import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { useMemo } from 'react';
import { ColorModeProvider, useColorMode } from './colorMode';

function ThemedApp({ children }: { children: React.ReactNode }) {
  const { mode } = useColorMode();

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === 'dark' ? '#7b6df5' : '#5f4fe6',
            dark: mode === 'dark' ? '#5f4fe6' : '#4938c2',
            light: mode === 'dark' ? '#9b8ef8' : '#7c6fef',
            contrastText: '#ffffff',
          },
          background: {
            default: mode === 'dark' ? '#0f0f12' : '#f5f5f5',
            paper: mode === 'dark' ? '#16161a' : '#ffffff',
          },
          text: {
            primary: mode === 'dark' ? '#f5f5f5' : '#1a1a1a',
            secondary: mode === 'dark' ? '#a1a1aa' : '#71717a',
          },
          divider: mode === 'dark' ? '#2e2e32' : '#e4e4e7',
          action: {
            hover: mode === 'dark' ? 'rgba(123, 109, 245, 0.08)' : 'rgba(95, 79, 230, 0.06)',
          },
        },
        shape: { borderRadius: 12 },
        typography: {
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          h4: { fontWeight: 700, letterSpacing: '-0.02em' },
          h6: { fontWeight: 700, letterSpacing: '-0.01em' },
          button: { fontWeight: 600, textTransform: 'none' },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                backgroundColor: mode === 'dark' ? '#0f0f12' : '#f5f5f5',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: { borderRadius: 10, boxShadow: 'none' },
              contained: {
                '&:hover': { boxShadow: 'none' },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                backgroundImage: 'none',
              },
            },
          },
          MuiListItemButton: {
            styleOverrides: {
              root: {
                borderRadius: 10,
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: { fontWeight: 600 },
            },
          },
          MuiFormControl: {
            defaultProps: {
              variant: 'outlined',
              size: 'small',
            },
          },
          MuiTextField: {
            defaultProps: {
              size: 'small',
              variant: 'outlined',
            },
          },
          MuiInputLabel: {
            styleOverrides: {
              root: ({ theme }) => ({
                color: theme.palette.text.secondary,
                fontSize: '0.875rem',
                fontWeight: 500,
                '&.MuiInputLabel-outlined.MuiInputLabel-sizeSmall:not(.MuiInputLabel-shrink)': {
                  transform: 'translate(14px, 8px) scale(1)',
                },
                '&.MuiInputLabel-outlined.MuiInputLabel-sizeSmall.MuiInputLabel-shrink': {
                  transform: 'translate(14px, -8px) scale(0.75)',
                },
                '&.MuiInputLabel-adornedStart.MuiInputLabel-outlined:not(.MuiInputLabel-shrink)': {
                  transform: 'translate(36px, 8px) scale(1)',
                },
                '&.MuiInputLabel-adornedStart.MuiInputLabel-outlined.MuiInputLabel-shrink': {
                  transform: 'translate(36px, -8px) scale(0.75)',
                },
              }),
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: 10,
                '& .MuiOutlinedInput-notchedOutline legend': {
                  fontSize: '0.7em',
                },
              },
              input: {
                fontSize: '0.875rem',
              },
              inputSizeSmall: {
                padding: '10px 14px',
              },
            },
          },
        },
      }),
    [mode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ColorModeProvider>
      <ThemedApp>{children}</ThemedApp>
    </ColorModeProvider>
  );
}
