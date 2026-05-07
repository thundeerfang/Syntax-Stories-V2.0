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
  Chip,
  Divider,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { getApiOrigin, getFeedbackSubmission, type FeedbackSubmissionDetail } from '@/lib/api';
import { useSessionStore } from '@/store/session';

export default function FeedbackDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const token = useSessionStore((s) => s.token);
  const [tab, setTab] = useState(0);
  const [submission, setSubmission] = useState<FeedbackSubmissionDetail | null>(null);
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
    void getFeedbackSubmission(token, id)
      .then(({ submission: s }) => {
        if (!cancelled) setSubmission(s);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load');
          setSubmission(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  const attachmentSrc =
    submission?.attachmentUrl && submission.attachmentUrl.startsWith('/')
      ? `${getApiOrigin()}${submission.attachmentUrl}`
      : submission?.attachmentUrl ?? null;

  if (!id) return null;

  return (
    <Stack spacing={3}>
      <Breadcrumbs>
        <Link href="/feedbacks" className="text-inherit underline-offset-4 hover:underline">
          Feedback
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
      ) : !submission ? (
        <Typography color="text.secondary">Nothing to show.</Typography>
      ) : (
        <>
          <Box>
            <Typography variant="h4" component="h1" fontWeight={800} className="tracking-tight" gutterBottom>
              {submission.subject}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              <Chip size="small" label={submission.categoryLabel} variant="outlined" />
              {submission.createdAt ? (
                <Typography variant="body2" color="text.secondary">
                  {new Date(submission.createdAt).toLocaleString(undefined, {
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
            <Tab label="Attachment" />
            <Tab label="Email delivery" />
          </Tabs>

          {tab === 0 ? (
            <Card
              elevation={0}
              className="border border-[var(--color-border)]"
              sx={{ borderColor: 'divider', borderRadius: 2 }}
            >
              <CardContent>
                <Stack spacing={1.5}>
                  <Row label="Name" value={`${submission.firstName} ${submission.lastName}`} />
                  <Row label="Email" value={submission.email} />
                  <Row label="Category" value={`${submission.categoryLabel} (${submission.categorySlug})`} />
                  {submission.username ? (
                    <Row
                      label="Account"
                      value={
                        submission.userId ? (
                          <Link href={`/users/${submission.userId}`} className="underline-offset-4 hover:underline">
                            @{submission.username}
                          </Link>
                        ) : (
                          `@${submission.username}`
                        )
                      }
                    />
                  ) : null}
                  <Row label="Submitted (IST)" value={submission.serverMeta.submittedAtIst} />
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
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Subject
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {submission.subject}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Description
                </Typography>
                <Typography
                  component="pre"
                  variant="body2"
                  sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', m: 0 }}
                >
                  {submission.description}
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
                  <Row label="IP" value={submission.serverMeta.ip ?? '—'} />
                  <Row label="X-Forwarded-For" value={submission.serverMeta.forwardedFor ?? '—'} />
                  <Row label="User-Agent" value={submission.serverMeta.userAgent ?? '—'} />
                  <Row label="IST timezone" value={submission.serverMeta.istTimeZone} />
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    Client metadata
                  </Typography>
                  {submission.clientMeta && Object.keys(submission.clientMeta).length > 0 ? (
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
                      {JSON.stringify(submission.clientMeta, null, 2)}
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

          {tab === 3 ? (
            <Card
              elevation={0}
              className="border border-[var(--color-border)]"
              sx={{ borderColor: 'divider', borderRadius: 2 }}
            >
              <CardContent>
                {!submission.attachmentUrl ? (
                  <Typography variant="body2" color="text.secondary">
                    No attachment for this submission.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {submission.attachmentTitle ? (
                      <Typography variant="body2">
                        <strong>Title:</strong> {submission.attachmentTitle}
                      </Typography>
                    ) : null}
                    {submission.attachmentMeta ? (
                      <Typography variant="caption" color="text.secondary" component="div">
                        {submission.attachmentMeta.mime ?? ''}{' '}
                        {submission.attachmentMeta.width != null && submission.attachmentMeta.height != null
                          ? `· ${submission.attachmentMeta.width}×${submission.attachmentMeta.height}`
                          : ''}
                        {submission.attachmentMeta.originalName
                          ? ` · ${submission.attachmentMeta.originalName}`
                          : ''}
                      </Typography>
                    ) : null}
                    {attachmentSrc?.match(/\.(webp|jpg|jpeg|png|gif)$/i) ? (
                      <Box
                        component="img"
                        src={attachmentSrc}
                        alt={submission.attachmentTitle || 'Attachment'}
                        sx={{ maxWidth: '100%', maxHeight: 480, borderRadius: 1, border: 1, borderColor: 'divider' }}
                      />
                    ) : (
                      <Typography variant="body2">
                        <a href={attachmentSrc ?? '#'} target="_blank" rel="noopener noreferrer">
                          Open file
                        </a>
                      </Typography>
                    )}
                  </Stack>
                )}
              </CardContent>
            </Card>
          ) : null}

          {tab === 4 ? (
            <Card
              elevation={0}
              className="border border-[var(--color-border)]"
              sx={{ borderColor: 'divider', borderRadius: 2 }}
            >
              <CardContent>
                <Stack spacing={1}>
                  <Row
                    label="Notification email"
                    value={submission.emailDelivered ? 'Sent' : 'Not confirmed sent'}
                  />
                  {submission.emailError ? <Row label="Send error" value={submission.emailError} /> : null}
                </Stack>
              </CardContent>
            </Card>
          ) : null}

          <Button component={Link} href="/feedbacks" variant="text" sx={{ alignSelf: 'flex-start' }}>
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
