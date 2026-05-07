'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { getContactLead, type ContactLeadDetail } from '@/lib/api';
import { useSessionStore } from '@/store/session';

export default function ContactLeadDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const token = useSessionStore((s) => s.token);
  const [tab, setTab] = useState(0);
  const [lead, setLead] = useState<ContactLeadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getContactLead(token, id)
      .then(({ lead: l }) => {
        if (!cancelled) setLead(l);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load');
          setLead(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  if (!id) return null;

  return (
    <Stack spacing={3}>
      <Breadcrumbs>
        <Link href="/contact-leads" className="text-inherit underline-offset-4 hover:underline">
          Contact leads
        </Link>
        <Typography color="text.primary">Detail</Typography>
      </Breadcrumbs>

      {error ? (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      ) : null}

      {loading ? (
        <Typography color="text.secondary">Loading…</Typography>
      ) : !lead ? (
        <Typography color="text.secondary">Nothing to show.</Typography>
      ) : (
        <>
          <Box>
            <Typography variant="h4" component="h1" fontWeight={800} className="tracking-tight" gutterBottom>
              {lead.topic}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              {lead.createdAt ? (
                <Typography variant="body2" color="text.secondary">
                  {new Date(lead.createdAt).toLocaleString(undefined, {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}
                </Typography>
              ) : null}
            </Stack>
          </Box>

          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
            }}
          >
            <Tab label="Summary" />
            <Tab label="Message" />
            <Tab label="Technical" />
          </Tabs>

          {tab === 0 ? (
            <Card
              elevation={0}
              className="border border-[var(--color-border)]"
              sx={{ borderColor: 'divider', borderRadius: 2 }}
            >
              <CardContent>
                <Stack spacing={1.5}>
                  <Row label="Name" value={lead.fullName} />
                  <Row label="Email" value={lead.email} />
                  {lead.company ? <Row label="Company" value={lead.company} /> : null}
                  {lead.username ? (
                    <Row
                      label="Account"
                      value={
                        lead.userId ? (
                          <Link href={`/users/${lead.userId}`} className="underline-offset-4 hover:underline">
                            @{lead.username}
                          </Link>
                        ) : (
                          `@${lead.username}`
                        )
                      }
                    />
                  ) : null}
                  <Row label="Submitted (IST)" value={lead.serverMeta.submittedAtIst} />
                </Stack>
              </CardContent>
            </Card>
          ) : null}

          {tab === 1 ? (
            <Card
              elevation={0}
              className="border border-[var(--color-border)]"
              sx={{ borderColor: 'divider', borderRadius: 2 }}
            >
              <CardContent>
                <Typography
                  component="pre"
                  variant="body2"
                  sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', m: 0 }}
                >
                  {lead.message}
                </Typography>
              </CardContent>
            </Card>
          ) : null}

          {tab === 2 ? (
            <Card
              elevation={0}
              className="border border-[var(--color-border)]"
              sx={{ borderColor: 'divider', borderRadius: 2 }}
            >
              <CardContent>
                <Stack spacing={1.5}>
                  <Row label="IP" value={lead.serverMeta.ip ?? '—'} />
                  <Row label="X-Forwarded-For" value={lead.serverMeta.forwardedFor ?? '—'} />
                  <Row label="User-Agent" value={lead.serverMeta.userAgent ?? '—'} />
                  <Row label="IST timezone" value={lead.serverMeta.istTimeZone} />
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    Client metadata
                  </Typography>
                  {lead.clientMeta && Object.keys(lead.clientMeta).length > 0 ? (
                    <Typography
                      component="pre"
                      variant="caption"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        bgcolor: 'action.hover',
                        p: 1.5,
                        borderRadius: 1,
                      }}
                    >
                      {JSON.stringify(lead.clientMeta, null, 2)}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      None
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ) : null}

          <Button component={Link} href="/contact-leads" variant="text" sx={{ alignSelf: 'flex-start' }}>
            ← Back to list
          </Button>
        </>
      )}
    </Stack>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.5}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 140, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Stack>
  );
}
