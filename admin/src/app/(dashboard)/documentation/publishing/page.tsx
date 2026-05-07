import { Box, Card, CardContent, Stack, Typography } from '@mui/material';

export default function DocumentationPublishingPage() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={800} className="tracking-tight" gutterBottom>
          Publishing & versions
        </Typography>
        <Typography variant="body1" color="text.secondary" className="max-w-2xl">
          Publish writes a live snapshot; increments <code>publishedVersion</code>; stores history in a separate
          collection to avoid MongoDB 16MB document growth (blueprint §8.1–8.2).
        </Typography>
      </Box>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Cache & SEO
          </Typography>
          <Typography variant="body2" color="text.secondary">
            On slug change: revalidate public paths; API returns <code>redirectTo</code> for legacy slugs. Canonical URLs
            come from the mapper (<code>canonicalPath</code>) — documentation category uses <code>/docs/&lt;slug&gt;</code>
            .
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
