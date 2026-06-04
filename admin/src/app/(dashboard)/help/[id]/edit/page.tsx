'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
} from '@mui/material';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import QuizRoundedIcon from '@mui/icons-material/QuizRounded';
import {
  getHelpArticle,
  patchHelpArticle,
  publishHelpArticle,
  type HelpArticleDetail,
} from '@/lib/api';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { nestedPageBreadcrumbs } from '@/components/layout/pageHeaderBreadcrumbs';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { HelpIconSelect } from '@/components/help/HelpIconSelect';
import { DEFAULT_HELP_ICON } from '@/lib/help/helpIcons';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';

function faqAnswerFromArticle(a: HelpArticleDetail): string {
  return (a.draftSummary ?? a.summary ?? a.draftBody ?? a.body ?? '').trim();
}

export default function EditArticlePage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : (params.id?.[0] ?? '');
  const router = useRouter();
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);

  const [article, setArticle] = useState<HelpArticleDetail | null>(null);
  const [title, setTitle] = useState('');
  const [answer, setAnswer] = useState('');
  const [icon, setIcon] = useState(DEFAULT_HELP_ICON);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!apiToken || !id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const a = await getHelpArticle(apiToken, id);
        if (cancelled) return;
        setArticle(a);
        setTitle(a.draftTitle ?? a.title);
        setAnswer(faqAnswerFromArticle(a));
        setIcon(a.icon ?? DEFAULT_HELP_ICON);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Load failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiToken, id]);

  async function save() {
    if (!apiToken || !article) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const r = await patchHelpArticle(apiToken, id, {
        draftTitle: title.trim(),
        draftSummary: answer.trim(),
        icon,
        expectedDraftVersion: article.draftVersion,
      });
      setMessage(`Draft saved (v${r.draftVersion})`);
      const a = await getHelpArticle(apiToken, id);
      setArticle(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!apiToken || !article) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await patchHelpArticle(apiToken, id, {
        draftTitle: title.trim(),
        draftSummary: answer.trim(),
        icon,
        expectedDraftVersion: article.draftVersion,
      });
      await publishHelpArticle(apiToken, id, article.publishedVersion);
      setMessage('FAQ item published');
      const a = await getHelpArticle(apiToken, id);
      setArticle(a);
      setTitle(a.draftTitle ?? a.title);
      setAnswer(faqAnswerFromArticle(a));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  }

  if (!apiToken) {
    router.replace('/login');
    return null;
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!article) {
    return (
      <Stack spacing={2}>
        <AdminFeedbackMessage
          severity="error"
          message={error ?? 'Article not found'}
          onClose={() => setError(null)}
        />
      </Stack>
    );
  }

  const displayTitle = title.trim() || article.title || article.slug;

  return (
    <Stack spacing={3}>
      <CentricPageHeader
        title={displayTitle}
        description="Edit the FAQ question and markdown answer, then save or publish to /help."
        icon={<QuizRoundedIcon />}
        breadcrumbs={[...nestedPageBreadcrumbs({ label: 'FAQ', href: '/help' }, displayTitle)]}
      />

      {error ? (
        <AdminFeedbackMessage severity="error" message={error} onClose={() => setError(null)} />
      ) : null}
      {message ? (
        <AdminFeedbackMessage severity="success" message={message} onClose={() => setMessage(null)} />
      ) : null}

      <AdminBlinkSectionHeader
        title="FAQ content"
        right={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SaveRoundedIcon />}
              disabled={busy || !title.trim()}
              onClick={() => void save()}
            >
              Save draft
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<PublishRoundedIcon />}
              disabled={busy || !title.trim() || !answer.trim()}
              onClick={() => void publish()}
            >
              Publish
            </Button>
          </Stack>
        }
      />

      <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, sm: 2.5 } }}>
        <Stack spacing={2}>
          <HelpIconSelect label="Accordion icon" value={icon} onChange={setIcon} disabled={busy} />
          <TextField
            label="Title"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            size="small"
            disabled={busy}
          />
          <TextField
            label="Answer (Markdown)"
            fullWidth
            multiline
            minRows={10}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            size="small"
            disabled={busy}
            helperText="This text appears in the FAQ accordion on /help."
            sx={{
              '& textarea': {
                fontFamily: 'ui-monospace, monospace',
                fontSize: '0.8125rem',
              },
            }}
          />
        </Stack>
      </Paper>
    </Stack>
  );
}
