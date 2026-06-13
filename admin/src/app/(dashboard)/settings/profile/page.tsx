'use client';

import { useCallback, useEffect, useState } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Alert,
  Avatar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import GppGoodRoundedIcon from '@mui/icons-material/GppGoodRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { fetchMe, type MeUser } from '@/lib/api';
import {
  fetchFederationStatus,
  fetchSessionRisk,
  type RiskAssessmentPayload,
} from '@/admin/api/management';
import { FederationSection, type FederationStatus } from '@/components/settings/FederationSection';
import { riskTone } from '@/components/settings/riskUtils';
import { SecuritySectionCard } from '@/components/settings/SecuritySectionCard';
import { SecurityStatTile } from '@/components/settings/SecurityStatTile';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminStatusBadge } from '@/components/ui/AdminStatusBadge';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useColorMode } from '@/theme/colorMode';
import { useSessionStore } from '@/store/session';

export default function SettingsProfilePage() {
  const theme = useTheme();
  const { mode, toggleColorMode } = useColorMode();
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const roleName = useSessionStore((s) => s.roleName);
  const sessionTier = useSessionStore((s) => s.sessionTier);
  const riskEngineEnabled = useSessionStore((s) => s.riskEngineEnabled);
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);
  const [user, setUser] = useState<MeUser | null>(null);
  const [risk, setRisk] = useState<RiskAssessmentPayload | null>(null);
  const [federation, setFederation] = useState<FederationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadExtras = useCallback(async () => {
    if (!apiToken && !httpOnlyCookies) return;
    try {
      if (riskEngineEnabled) {
        const r = await fetchSessionRisk(apiToken);
        setRisk(r);
      }
      if (hasPermission('audit:read')) {
        const fed = await fetchFederationStatus(apiToken);
        setFederation(fed);
      }
    } catch {
      /* optional context — do not block profile */
    }
  }, [apiToken, httpOnlyCookies, riskEngineEnabled, hasPermission]);

  useEffect(() => {
    let cancelled = false;
    void fetchMe(apiToken)
      .then((r) => {
        if (!cancelled) setUser(r.user);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load profile');
      });
    void loadExtras();
    return () => {
      cancelled = true;
    };
  }, [apiToken, loadExtras]);

  const displayName = user?.fullName ?? 'Operator';
  const initial = displayName.charAt(0).toUpperCase();
  const superAdmin = roleName?.toLowerCase() === 'super admin';

  return (
    <Stack spacing={3}>
      <AdminBlinkSectionHeader title="Profile" />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2}>
        {sessionTier ? (
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <SecurityStatTile
              icon={VerifiedUserRoundedIcon}
              label="Session tier"
              value={sessionTier}
              tone="primary"
            />
          </Grid>
        ) : null}
        {risk ? (
          <>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <SecurityStatTile
                icon={ShieldRoundedIcon}
                label="Risk score"
                value={risk.score}
                tone={riskTone(risk.decision)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <SecurityStatTile
                icon={risk.decision === 'BLOCK' ? WarningAmberRoundedIcon : GppGoodRoundedIcon}
                label="Decision"
                value={
                  <AdminStatusBadge
                    label={risk.decision}
                    tone={riskTone(risk.decision)}
                    emphasis
                  />
                }
                tone={riskTone(risk.decision)}
              />
            </Grid>
          </>
        ) : null}
      </Grid>

      {risk && risk.signals.length > 0 ? (
        <SecuritySectionCard
          icon={InsightsRoundedIcon}
          title="Risk signals"
          subtitle="Factors evaluated for this session"
        >
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75}>
            {risk.signals.map((s) => (
              <AdminStatusBadge
                key={s}
                label={s}
                tone="warning"
                icon={<WarningAmberRoundedIcon fontSize="inherit" />}
              />
            ))}
          </Stack>
        </SecuritySectionCard>
      ) : null}

      {federation ? <FederationSection federation={federation} /> : null}

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              fontWeight: 700,
              fontSize: '1.5rem',
              border: superAdmin ? '2px dashed' : 'none',
              borderColor: superAdmin ? alpha(theme.palette.grey[500], 0.5) : undefined,
            }}
          >
            {initial}
          </Avatar>
          <Stack sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={700}>
              {displayName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              @{user?.username ?? '—'}
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
              {roleName ? (
                <Chip label={roleName} size="small" color={superAdmin ? 'default' : 'primary'} />
              ) : null}
              {user?.staffRole ? (
                <Chip label={user.staffRole} size="small" variant="outlined" />
              ) : null}
            </Stack>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <List disablePadding dense>
          <ListItem disablePadding sx={{ py: 0.75 }}>
            <ListItemText primary="Email" secondary={user?.email ?? '—'} />
          </ListItem>
          <ListItem disablePadding sx={{ py: 0.75 }}>
            <ListItemText
              primary="User ID"
              secondary={user?._id ?? '—'}
              secondaryTypographyProps={{ sx: { fontFamily: 'monospace', fontSize: '0.75rem' } }}
            />
          </ListItem>
          <ListItem disablePadding sx={{ py: 0.75 }}>
            <ListItemText
              primary="Appearance"
              secondary={mode === 'dark' ? 'Dark mode' : 'Light mode'}
            />
          </ListItem>
        </List>

        <Chip
          label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={() => toggleColorMode()}
          clickable
          sx={{ mt: 1 }}
        />
      </Paper>
    </Stack>
  );
}
