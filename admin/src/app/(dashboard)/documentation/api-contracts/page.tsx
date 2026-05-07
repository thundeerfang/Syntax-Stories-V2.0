import { Box, Card, CardContent, Stack, Typography } from '@mui/material';

export default function DocumentationApiContractsPage() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={800} className="tracking-tight" gutterBottom>
          API contracts
        </Typography>
        <Typography variant="body1" color="text.secondary" className="max-w-2xl">
          Versioned envelopes, backward-compatible changes (blueprint §5). Public list includes{' '}
          <code>version</code>, <code>listPipelineVersion</code>, and paginated <code>data</code>.
        </Typography>
      </Box>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Public (stable)
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            <code>GET /api/v1/help/articles</code> — optional <code>?category=</code>
            <br />
            <code>GET /api/v1/help/articles/:slug</code> — <code>canonicalPath</code>, optional <code>redirectTo</code>
          </Typography>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Admin (staff JWT)
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            <code>/api/v1/admin/help/articles</code> — list, create, patch, publish, rollback, lock…
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
