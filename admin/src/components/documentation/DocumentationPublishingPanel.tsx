'use client';

import { Card, CardContent, Stack, Typography } from '@mui/material';

export function DocumentationPublishingPanel() {
  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Help center publish writes a live snapshot, increments <code>publishedVersion</code>, and
        stores history in <code>help_article_versions</code>. Product documentation uses the same
        storage model but is not edited from FAQ admin.
      </Typography>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Versioning
          </Typography>
          <Typography variant="body2" color="text.secondary" component="ul" sx={{ pl: 2.5, m: 0 }}>
            <li>
              <code>draftVersion</code> increments on each save; optimistic concurrency via{' '}
              <code>expectedDraftVersion</code> on PATCH.
            </li>
            <li>
              <code>publishedVersion</code> increments on publish; rollback restores a prior
              snapshot.
            </li>
            <li>Legal policies use a separate revision model (see Legal CMS).</li>
          </Typography>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Cache & SEO
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Help center articles canonicalize to <code>/help/&lt;slug&gt;</code>. Product docs use{' '}
            <code>/docs/&lt;slug&gt;</code>. Legacy slugs may return <code>redirectTo</code> on
            public GET.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
