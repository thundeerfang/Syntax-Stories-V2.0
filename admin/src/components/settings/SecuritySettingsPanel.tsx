'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Stack } from '@mui/material';
import DevicesOtherRoundedIcon from '@mui/icons-material/DevicesOtherRounded';
import DevicesRoundedIcon from '@mui/icons-material/DevicesRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PhonelinkLockRoundedIcon from '@mui/icons-material/PhonelinkLockRounded';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { adminSessionColumns, trustedDeviceColumns } from './securitySettingsColumns';
import { SecuritySectionCard } from './SecuritySectionCard';
import {
  listMySessions,
  listTrustedDevices,
  revokeMySession,
  revokeOtherSessions,
  revokeTrustedDevice,
  trustCurrentDevice,
  type AdminSessionRow,
  type TrustedDeviceRow,
} from '@/admin/api/management';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { PasskeyStepUpCard } from '@/components/settings/PasskeyStepUpCard';
import { useSessionStore } from '@/store/session';

export function SecuritySettingsPanel() {
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const deviceBindingEnabled = useSessionStore((s) => s.deviceBindingEnabled);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);
  const [sessions, setSessions] = useState<AdminSessionRow[]>([]);
  const [devices, setDevices] = useState<TrustedDeviceRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!apiToken && !httpOnlyCookies) return;
    setLoading(true);
    setError(null);
    try {
      const sess = await listMySessions(apiToken);
      setSessions(sess.sessions);
      if (deviceBindingEnabled) {
        const d = await listTrustedDevices(apiToken);
        setDevices(d.devices);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'Step-up cancelled') return;
      setError(msg || 'Failed to load security data');
    } finally {
      setLoading(false);
    }
  }, [apiToken, httpOnlyCookies, deviceBindingEnabled]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onTrustDevice() {
    await trustCurrentDevice(apiToken);
    await load();
  }

  async function onRevokeDevice(id: string) {
    await revokeTrustedDevice(apiToken, id);
    await load();
  }

  async function onRevoke(id: string) {
    if (!apiToken && !httpOnlyCookies) return;
    await revokeMySession(apiToken, id);
    await load();
  }

  async function onRevokeOthers() {
    if (!apiToken && !httpOnlyCookies) return;
    await revokeOtherSessions(apiToken);
    await load();
  }

  const deviceCols = useMemo(
    () => trustedDeviceColumns({ onRevoke: (id) => void onRevokeDevice(id) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const sessionCols = useMemo(
    () => adminSessionColumns({ onRevoke: (id) => void onRevoke(id) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <Stack spacing={3}>
      <AdminBlinkSectionHeader title="Account security" />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <PasskeyStepUpCard />

      <SecuritySectionCard
        icon={DevicesRoundedIcon}
        title="Your sessions"
        subtitle="Browsers and devices signed in as you"
        action={
          <Button
            size="small"
            variant="outlined"
            startIcon={<LogoutRoundedIcon />}
            onClick={() => void onRevokeOthers()}
            disabled={loading || sessions.length < 2}
          >
            Revoke others
          </Button>
        }
      >
        <AdminDataTable
          data={sessions}
          columns={sessionCols}
          loading={loading}
          getRowId={(row) => row.id}
          emptyMessage="No active sessions"
          totalLabel="sessions"
          enablePagination={sessions.length > 10}
          pageSize={10}
          dense
        />
      </SecuritySectionCard>

      {deviceBindingEnabled ? (
        <SecuritySectionCard
          icon={PhonelinkLockRoundedIcon}
          title="Trusted devices"
          subtitle="Devices that skip extra checks on sign-in"
          action={
            <Button
              size="small"
              variant="contained"
              startIcon={<DevicesOtherRoundedIcon />}
              onClick={() => void onTrustDevice()}
            >
              Trust this device
            </Button>
          }
        >
          <AdminDataTable
            data={devices}
            columns={deviceCols}
            loading={loading}
            getRowId={(row) => row.id}
            emptyMessage="No trusted devices yet"
            totalLabel="devices"
            enablePagination={devices.length > 10}
            pageSize={10}
            dense
          />
        </SecuritySectionCard>
      ) : null}
    </Stack>
  );
}
