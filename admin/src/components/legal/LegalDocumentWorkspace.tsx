'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import {
  ensureLegalPolicyForKind,
  getLegalRevision,
  patchLegalPolicy,
  type LegalPolicyKind,
  type LegalPolicyRecord,
} from '@/lib/api/legalAdmin';
import { LEGAL_KIND_LABEL } from '@/lib/legal/legalLabels';
import { legalTabHref } from '@/lib/legal/legalPaths';
import {
  nextDraftVersionLabel,
  parseMarkdownHeadings,
  type MarkdownHeading,
} from '@/lib/legal/parseMarkdownHeadings';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { AdminMarkdownView, scrollToMarkdownHeading } from '@/components/ui/AdminMarkdownView';
import { LegalDocumentStatusBadge } from '@/components/legal/LegalVersionBadge';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { nestedPageBreadcrumbs } from '@/components/layout/pageHeaderBreadcrumbs';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';

export type LegalDocumentWorkspaceProps = {
  kind: LegalPolicyKind;
  apiToken: string | null;
  mode: 'draft' | 'revision';
  revisionId?: string;
  readOnly?: boolean;
  /** When true, starts a new draft from the live version if the policy is only published. */
  startDraft?: boolean;
  cachedPolicy?: LegalPolicyRecord | null;
};

/** ~10 dense TOC rows before vertical scroll. */
const TOC_VISIBLE_ROWS = 10;
const TOC_ROW_HEIGHT_PX = 36;
const TOC_LIST_MAX_HEIGHT = TOC_VISIBLE_ROWS * TOC_ROW_HEIGHT_PX;

function scrollBodyToHeading(
  body: string,
  heading: MarkdownHeading,
  textarea: HTMLTextAreaElement | null
) {
  if (!textarea) return;
  const lines = body.split('\n');
  const prefix = '#'.repeat(heading.level);
  const idx = lines.findIndex((line) => {
    const t = line.trim();
    return t === `${prefix} ${heading.text}` || t.replace(/\s+#+\s*$/, '') === `${prefix} ${heading.text}`;
  });
  if (idx < 0) return;
  textarea.focus();
  textarea.scrollTop = Math.max(0, idx * 20 - 40);
}

export function LegalDocumentWorkspace({
  kind,
  apiToken,
  mode,
  revisionId,
  readOnly = false,
  startDraft = false,
  cachedPolicy = null,
}: LegalDocumentWorkspaceProps) {
  const router = useRouter();
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const [policy, setPolicy] = useState<LegalPolicyRecord | null>(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [versionLabel, setVersionLabel] = useState('');
  const [versionNumber, setVersionNumber] = useState<number | null>(null);
  const [statusLabel, setStatusLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const locked = readOnly || mode === 'revision';

  const load = useCallback(async () => {
    if (!apiToken) return;
    setLoading(true);
    setError(null);
    try {
      let p = await ensureLegalPolicyForKind(apiToken, kind, cachedPolicy);
      if (startDraft && mode === 'draft' && !readOnly && p.status === 'published') {
        p = await patchLegalPolicy(apiToken, p._id, { action: 'start_draft' });
      }
      setPolicy(p);

      if (mode === 'draft') {
        setTitle(p.title);
        setSummary(p.summary ?? '');
        setBody(p.body ?? '');
        setStatusLabel(p.status);
        const nextVer = p.publishedRevisionId ? (p.version ?? 0) + 1 : Math.max(1, p.version || 1);
        setVersionNumber(nextVer);
        setVersionLabel(
          nextDraftVersionLabel(p.version ?? 0, Boolean(p.publishedRevisionId))
        );
        setStatusLabel(locked ? 'draft' : p.status);
      } else if (revisionId) {
        const rev = await getLegalRevision(apiToken, p._id, revisionId);
        setTitle(rev.title);
        setSummary(rev.summary ?? '');
        setBody(rev.body ?? '');
        setStatusLabel(rev.status);
        setVersionNumber(rev.version);
        setVersionLabel(`v${rev.version}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [
    apiToken,
    kind,
    mode,
    revisionId,
    locked,
    startDraft,
    readOnly,
    cachedPolicy,
    setLoading,
    setError,
    setPolicy,
    setTitle,
    setSummary,
    setBody,
    setStatusLabel,
    setVersionNumber,
    setVersionLabel,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const headings = useMemo(() => parseMarkdownHeadings(body), [body]);

  const displayStatus =
    mode === 'revision'
      ? statusLabel
      : policy?.publishedRevisionId && policy.status === 'published'
        ? 'published'
        : statusLabel;

  async function runAction(
    action: Parameters<typeof patchLegalPolicy>[2]['action'],
    extra?: Partial<Parameters<typeof patchLegalPolicy>[2]>
  ) {
    if (!apiToken || !policy || locked) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await patchLegalPolicy(apiToken, policy._id, {
        action,
        title,
        summary,
        body,
        changeLog: extra?.changeLog ?? `Admin ${action}`,
        ...extra,
      });
      setPolicy(updated);
      setStatusLabel(updated.status);
      setVersionLabel(
        nextDraftVersionLabel(updated.version ?? 0, Boolean(updated.publishedRevisionId))
      );
      setMessage(`Saved — status is now ${updated.status.replace(/_/g, ' ')}.`);
      if (action === 'publish') {
        router.push(legalTabHref(kind));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  const label = LEGAL_KIND_LABEL[kind];
  const pageTitle =
    mode === 'draft'
      ? locked
        ? `View draft — ${label}`
        : `Edit draft — ${label}`
      : `View version — ${label}`;

  if (loading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading document…
      </Typography>
    );
  }

  return (
    <Stack spacing={3}>
      <CentricPageHeader
        title={pageTitle}
        description={
          mode === 'draft'
            ? 'Working copy for the next publish. Version is assigned automatically on publish.'
            : 'Read-only snapshot of a published or superseded revision.'
        }
        icon={<GavelRoundedIcon />}
        breadcrumbs={[
          ...nestedPageBreadcrumbs({ label: 'Legal', href: '/legal' }, label, legalTabHref(kind)),
          { label: mode === 'draft' ? (locked ? 'View draft' : 'Draft') : versionLabel },
        ]}
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <LegalDocumentStatusBadge status={displayStatus} version={versionNumber} />
          </Stack>
        }
      />

      {error ? (
        <AdminFeedbackMessage severity="error" message={error} onClose={() => setError(null)} />
      ) : null}
      {message ? (
        <AdminFeedbackMessage severity="success" message={message} onClose={() => setMessage(null)} />
      ) : null}

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2.5,
          alignItems: 'flex-start',
          width: '100%',
        }}
      >
        <Box
          sx={{
            width: { xs: '100%', md: 260 },
            flexShrink: 0,
            position: { md: 'sticky' },
            top: { md: 88 },
            alignSelf: 'flex-start',
          }}
        >
          <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ px: 1, pb: 1 }}>
              Table of contents
            </Typography>
            {headings.length === 0 ? (
              <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                {locked
                  ? 'No headings in this document.'
                  : 'Add markdown headings (# Title) in the body to build a TOC.'}
              </Typography>
            ) : (
              <Box
                sx={{
                  maxHeight: TOC_LIST_MAX_HEIGHT,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  pr: 0.5,
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                <List dense disablePadding>
                  {headings.map((h) => (
                    <ListItemButton
                      key={h.id}
                      sx={{
                        pl: 1 + (h.level - 1) * 1.5,
                        py: 0.35,
                        minHeight: TOC_ROW_HEIGHT_PX,
                        borderRadius: 1,
                      }}
                      onClick={() =>
                        locked
                          ? scrollToMarkdownHeading(h.id)
                          : scrollBodyToHeading(body, h, bodyRef.current)
                      }
                    >
                      <ListItemText
                        primary={h.text}
                        primaryTypographyProps={{
                          variant: 'caption',
                          fontWeight: h.level <= 2 ? 600 : 400,
                        }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Box>
            )}
          </Paper>

          {!locked && policy ? (
            <Stack spacing={1} sx={{ mt: 1.5, width: '100%' }}>
              <Button
                variant="contained"
                size="small"
                fullWidth
                startIcon={<SaveRoundedIcon />}
                disabled={busy || policy.status === 'archived'}
                onClick={() => void runAction('save_draft')}
              >
                Save draft
              </Button>
              {policy.status === 'draft' ? (
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  disabled={busy}
                  onClick={() => void runAction('submit_review')}
                >
                  Submit for review
                </Button>
              ) : null}
              {policy.status === 'in_review' ? (
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  disabled={busy}
                  onClick={() => void runAction('approve')}
                >
                  Approve
                </Button>
              ) : null}
              {policy.status === 'approved' || policy.status === 'published' ? (
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  color="primary"
                  startIcon={<PublishRoundedIcon />}
                  disabled={busy}
                  onClick={() => void runAction('publish', { isMajor: false })}
                >
                  Publish
                </Button>
              ) : null}
            </Stack>
          ) : null}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, sm: 2.5 }, width: '100%' }}>
            {locked ? (
              <Stack spacing={2.5} sx={{ width: '100%' }}>
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
                    Title
                  </Typography>
                  <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, lineHeight: 1.3 }}>
                    {title || 'Untitled'}
                  </Typography>
                </Box>
                {summary.trim() ? (
                  <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
                      Summary
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.6 }}>
                      {summary}
                    </Typography>
                  </Box>
                ) : null}
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em', mb: 1 }}>
                    Document
                  </Typography>
                  <AdminMarkdownView markdown={body} />
                </Box>
              </Stack>
            ) : (
              <Stack spacing={2} sx={{ width: '100%' }}>
                <TextField
                  label="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  fullWidth
                  size="small"
                  disabled={busy}
                  required
                  sx={{ width: '100%' }}
                />
                <TextField
                  label="Version"
                  value={versionLabel}
                  fullWidth
                  size="small"
                  disabled
                  helperText="Auto-generated on publish"
                  sx={{ width: '100%' }}
                />
                <TextField
                  label="Summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  fullWidth
                  size="small"
                  multiline
                  minRows={2}
                  disabled={busy}
                />
                <TextField
                  label="Body (Markdown)"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  fullWidth
                  multiline
                  minRows={18}
                  disabled={busy}
                  inputRef={bodyRef}
                  sx={{
                    width: '100%',
                    '& .MuiInputBase-root': { width: '100%' },
                    '& textarea': {
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: '0.8125rem',
                      width: '100%',
                    },
                  }}
                />
              </Stack>
            )}
          </Paper>
        </Box>
      </Box>
    </Stack>
  );
}
