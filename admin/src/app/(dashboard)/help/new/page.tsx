'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Paper, Stack, TextField } from '@mui/material';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import QuizRoundedIcon from '@mui/icons-material/QuizRounded';
import {
  createHelpArticle,
  patchHelpArticle,
  publishHelpArticle,
} from '@/lib/api';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { nestedPageBreadcrumbs } from '@/components/layout/pageHeaderBreadcrumbs';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { HelpIconSelect } from '@/components/help/HelpIconSelect';
import { DEFAULT_HELP_ICON, normalizeHelpIconKey } from '@/lib/help/helpIcons';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';

export default function NewFaqItemPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);

  const initialIcon = normalizeHelpIconKey(searchParams.get('icon') ?? DEFAULT_HELP_ICON);

  const [title, setTitle] = useState('');
  const [answer, setAnswer] = useState('');
  const [icon, setIcon] = useState(initialIcon);
  const [articleId, setArticleId] = useState<string | null>(null);
  const [draftVersion, setDraftVersion] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function persistDraft(): Promise<{ id: string; created: boolean }> {
    if (!apiToken) {
      router.replace('/login');
      throw new Error('Not authenticated');
    }
    const trimmedTitle = title.trim();
    const trimmedAnswer = answer.trim();
    if (!trimmedTitle) {
      throw new Error('Title is required');
    }

    let id = articleId;
    let version = draftVersion;
    let created = false;

    if (!id) {
      const result = await createHelpArticle(apiToken, {
        title: trimmedTitle,
        summary: trimmedAnswer,
        icon,
      });
      id = result.id;
      created = true;
      setArticleId(id);
    }

    const r = await patchHelpArticle(apiToken, id, {
      draftTitle: trimmedTitle,
      draftSummary: trimmedAnswer,
      icon,
      expectedDraftVersion: version,
    });
    setDraftVersion(r.draftVersion);
    return { id, created };
  }

  async function saveDraft() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { id, created } = await persistDraft();
      if (created) {
        router.replace(`/help/${id}/edit`);
        return;
      }
      setMessage('Draft saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { id } = await persistDraft();
      await publishHelpArticle(apiToken!, id, 0);
      router.replace(`/help/${id}/edit`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={3}>
      <CentricPageHeader
        title="New FAQ item"
        description="Add a question and markdown answer for the public /help page."
        icon={<QuizRoundedIcon />}
        breadcrumbs={[...nestedPageBreadcrumbs({ label: 'FAQ', href: '/help' }, 'New FAQ item')]}
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
              onClick={() => void saveDraft()}
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
            required
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            size="small"
            disabled={busy}
          />
          <TextField
            label="Answer (Markdown)"
            required
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
