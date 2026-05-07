import { Box, Card, CardContent, Stack, Typography } from '@mui/material';

export default function DocumentationCmsWorkflowPage() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={800} className="tracking-tight" gutterBottom>
          CMS workflow
        </Typography>
        <Typography variant="body1" color="text.secondary" className="max-w-2xl">
          Draft → publish snapshots, optional schedule (<code>publishAt</code>), edit locks, rollback from{' '}
          <code>help_article_versions</code> — see blueprint §8.
        </Typography>
      </Box>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Editor responsibilities
          </Typography>
          <Typography variant="body2" color="text.secondary" component="ul" sx={{ pl: 2, m: 0 }}>
            <li>Save drafts; body length gates apply on publish (§6.5).</li>
            <li>Respect locks — 409 if another editor holds the article.</li>
            <li>
              Category <code>documentation</code> surfaces under public <code>/docs</code>; other categories default to{' '}
              <code>/help</code> URLs in the API mapper.
            </li>
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
