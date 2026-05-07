'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import {
  getHelpArticle,
  patchHelpArticle,
  publishHelpArticle,
  type HelpArticleDetail,
} from '@/lib/api';
import { useSessionStore } from '@/store/session';

export default function EditArticlePage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? '';
  const router = useRouter();
  const token = useSessionStore((s) => s.token);
  const [article, setArticle] = useState<HelpArticleDetail | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftSummary, setDraftSummary] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const a = await getHelpArticle(token, id);
        if (cancelled) return;
        setArticle(a);
        setDraftTitle(a.draftTitle ?? a.title);
        setDraftSummary(a.draftSummary ?? a.summary);
        setDraftBody(a.draftBody ?? a.body);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Load failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  async function save() {
    if (!token || !article) return;
    setErr(null);
    setMsg(null);
    try {
      const r = await patchHelpArticle(token, id, {
        draftTitle,
        draftSummary,
        draftBody,
        expectedDraftVersion: article.draftVersion,
      });
      setMsg(`Saved (draft v${r.draftVersion})`);
      const a = await getHelpArticle(token, id);
      setArticle(a);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    }
  }

  async function publish() {
    if (!token || !article) return;
    setErr(null);
    setMsg(null);
    try {
      await publishHelpArticle(token, id, article.publishedVersion);
      setMsg('Published');
      const a = await getHelpArticle(token, id);
      setArticle(a);
      setDraftTitle(a.draftTitle ?? a.title);
      setDraftSummary(a.draftSummary ?? a.summary);
      setDraftBody(a.draftBody ?? a.body);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Publish failed');
    }
  }

  if (!token) {
    router.replace('/login');
    return null;
  }

  if (loading) {
    return (
      <Box className="flex justify-center py-16">
        <CircularProgress />
      </Box>
    );
  }

  if (!article) {
    return (
      <Box>
        <Typography color="error">{err ?? 'Not found'}</Typography>
        <Button component={Link} href="/help" className="mt-4">
          Back
        </Button>
      </Box>
    );
  }

  return (
    <Box className="mx-auto max-w-3xl">
      <Button
        component={Link}
        href="/help"
        startIcon={<ArrowBackRoundedIcon />}
        size="small"
        className="mb-4"
        sx={{ color: 'text.secondary' }}
      >
        Articles
      </Button>
      <Box className="mb-4 flex flex-wrap items-center gap-3">
        <Typography variant="h4" component="h1" fontWeight={800} className="tracking-tight">
          Edit: {article.slug}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          draft v{article.draftVersion} · published v{article.publishedVersion}
        </Typography>
      </Box>

      {err && <Alert severity="error" className="mb-3">{err}</Alert>}
      {msg && <Alert severity="success" className="mb-3">{msg}</Alert>}

      <Paper elevation={0} className="border border-[var(--color-border)] p-6" sx={{ borderColor: 'divider' }}>
        <Stack spacing={3}>
          <TextField label="Draft title" fullWidth value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} size="small" />
          <TextField label="Draft summary" fullWidth value={draftSummary} onChange={(e) => setDraftSummary(e.target.value)} size="small" />
          <TextField
            label="Draft body (markdown)"
            fullWidth
            multiline
            minRows={16}
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            InputProps={{ sx: { fontFamily: 'ui-monospace, monospace', fontSize: '0.875rem' } }}
          />
          <Typography variant="caption" color="text.secondary">
            Publish requires title + body ≥ 50 characters (see CMS blueprint).
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button type="button" variant="outlined" color="inherit" onClick={() => void save()}>
              Save draft
            </Button>
            <Button type="button" variant="contained" onClick={() => void publish()}>
              Publish
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
