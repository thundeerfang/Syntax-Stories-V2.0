'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import { listFeedbackSubmissions, type FeedbackSubmissionListItem } from '@/lib/api';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { pageBreadcrumbs } from '@/components/layout/pageHeaderBreadcrumbs';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { AdminTabs } from '@/components/ui/AdminTabs';
import { FeedbackCategoriesPanel } from '@/components/feedback/FeedbackCategoriesPanel';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';
import { feedbacksColumns } from './feedbacksColumns';

export default function FeedbacksPage() {
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const permissions = useSessionStore((s) => s.permissions);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);
  const canManageCategories =
    permissions.length === 0 ||
    hasPermission('feedback:manage') ||
    hasPermission('feedback:read');

  const [tab, setTab] = useState(0);
  const [items, setItems] = useState<FeedbackSubmissionListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const columns = useMemo(() => feedbacksColumns, []);

  const load = useCallback(
    async (cursor?: string | null) => {
      if (!apiToken) return;
      setLoading(true);
      setError(null);
      try {
        const r = await listFeedbackSubmissions(apiToken, {
          limit: 30,
          cursor: cursor ?? undefined,
        });
        if (cursor) {
          setItems((prev) => [...prev, ...r.items]);
        } else {
          setItems(r.items);
        }
        setNextCursor(r.nextCursor);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load feedback');
      } finally {
        setLoading(false);
      }
    },
    [apiToken]
  );

  useEffect(() => {
    if (tab === 0) void load();
  }, [load, tab]);

  const tabs = useMemo(
    () => [
      { label: 'Submissions', icon: RateReviewRoundedIcon },
      { label: 'Categories', icon: CategoryRoundedIcon },
    ],
    []
  );

  return (
    <Stack spacing={2}>
      <CentricPageHeader
        title="Feedback"
        description="Review submissions and manage categories shown on the public feedback form."
        icon={<RateReviewRoundedIcon />}
        breadcrumbs={pageBreadcrumbs('Feedback', '/feedbacks')}
      />

      <AdminTabs tabs={tabs} value={tab} onChange={setTab}>
        {tab === 0 ? (
          <Stack spacing={2}>
            {error ? (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            ) : null}

            <AdminDataTable
              data={items}
              columns={columns}
              loading={loading && items.length === 0}
              getRowId={(row) => row.id}
              emptyMessage="No submissions yet."
              totalLabel="submissions"
              pageSize={25}
              dense
            />

            {nextCursor ? (
              <Box>
                <Button variant="outlined" disabled={loading} onClick={() => void load(nextCursor)}>
                  {loading ? <CircularProgress size={20} /> : 'Load more'}
                </Button>
              </Box>
            ) : null}
          </Stack>
        ) : (
          <FeedbackCategoriesPanel token={apiToken} canManage={canManageCategories} />
        )}
      </AdminTabs>
    </Stack>
  );
}
