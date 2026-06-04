'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { getApiOrigin } from '@/lib/api';
import {
  ADMIN_HELP_LEGAL_ROUTES,
  formatRouteLine,
  PUBLIC_HELP_LEGAL_ROUTES,
} from '@/lib/documentation/apiContracts';
import { probePublicHelpApi } from '@/lib/documentation/probePublicHelpApi';

type Probe = { ok: boolean; message: string; total?: number; version?: string };

export function DocumentationApiContractsPanel() {
  const origin = getApiOrigin() || 'http://localhost:7373';
  const [probe, setProbe] = useState<Probe | null>(null);
  const [probing, setProbing] = useState(false);

  const runProbe = useCallback(async () => {
    setProbing(true);
    try {
      const result = await probePublicHelpApi('general');
      setProbe(result);
    } finally {
      setProbing(false);
    }
  }, []);

  useEffect(() => {
    void runProbe();
  }, [runProbe]);

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Versioned JSON envelopes on public routes (<code>version</code>,{' '}
        <code>listPipelineVersion</code>, paginated <code>data</code>, <code>total</code>). Admin
        routes require staff JWT (or session cookies) and <code>help:manage</code> /{' '}
        <code>legal:manage</code>.
      </Typography>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle1" fontWeight={700}>
              Live public probe
            </Typography>
            {probing ? (
              <CircularProgress size={16} />
            ) : probe ? (
              <Typography variant="caption" color={probe.ok ? 'success.main' : 'error.main'}>
                {probe.message}
                {probe.total != null ? ` · ${probe.total} help article(s)` : ''}
                {probe.version ? ` · v${probe.version}` : ''}
              </Typography>
            ) : null}
            <Button size="small" onClick={() => void runProbe()} disabled={probing}>
              Test GET /help/articles
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Base URL
          </Typography>
          <Box
            component="code"
            sx={{
              display: 'block',
              fontFamily: 'monospace',
              fontSize: '0.8125rem',
              p: 1.5,
              borderRadius: 1,
              bgcolor: 'action.hover',
            }}
          >
            {origin}
          </Box>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Public (stable)
          </Typography>
          <Stack component="ul" spacing={0.75} sx={{ pl: 2.5, m: 0 }}>
            {PUBLIC_HELP_LEGAL_ROUTES.map((route) => (
              <Typography key={route.path + route.method} variant="body2" color="text.secondary" component="li">
                <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {formatRouteLine(route)}
                </Box>
              </Typography>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Admin (staff)
          </Typography>
          <Stack component="ul" spacing={0.75} sx={{ pl: 2.5, m: 0 }}>
            {ADMIN_HELP_LEGAL_ROUTES.map((route) => (
              <Typography key={route.path + route.method} variant="body2" color="text.secondary" component="li">
                <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {formatRouteLine(route)}
                </Box>
              </Typography>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
