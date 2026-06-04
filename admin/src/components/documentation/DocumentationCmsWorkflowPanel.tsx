'use client';

import { Card, CardContent, Stack, Typography } from '@mui/material';

export function DocumentationCmsWorkflowPanel() {
  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Help center FAQ items use the same draft → publish pipeline as other CMS content, but are
        managed only from <strong>FAQ</strong> in the sidebar — not from this documentation hub.
      </Typography>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Help center editor flow
          </Typography>
          <Typography variant="body2" color="text.secondary" component="ol" sx={{ pl: 2.5, m: 0 }}>
            <li>Create article — title only; slug auto-generated on server.</li>
            <li>Edit draft — title, summary, markdown body; save increments draft version.</li>
            <li>Publish — requires title + body ≥ 50 characters; writes live snapshot.</li>
            <li>Soft delete — moves to trash; restore from Soft delete center.</li>
          </Typography>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Public URLs
          </Typography>
          <Typography variant="body2" color="text.secondary" component="ul" sx={{ pl: 2.5, m: 0 }}>
            <li>
            Help center → <code>/help</code> FAQ on the webapp (FAQ admin only)
            </li>
            <li>
              Product docs → <code>/docs/&lt;slug&gt;</code> on webapp + docs-webapp (separate from
              FAQ)
            </li>
            <li>Slug changes append to <code>slugHistory</code>; API may return redirect hints.</li>
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
