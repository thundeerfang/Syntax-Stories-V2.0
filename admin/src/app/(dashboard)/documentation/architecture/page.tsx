import { Box, Card, CardContent, Stack, Typography } from '@mui/material';

export default function DocumentationArchitecturePage() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={800} className="tracking-tight" gutterBottom>
          Architecture & layers
        </Typography>
        <Typography variant="body1" color="text.secondary" className="max-w-2xl">
          Matches blueprint §4 — thin controllers, <code>help.service.ts</code> for rules, explicit DTO mappers (no raw
          document spread), public vs admin route prefixes.
        </Typography>
      </Box>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Request flow
          </Typography>
          <Typography variant="body2" color="text.secondary" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}>
            {`Next.js (webapp | admin)
  → HTTP → help.controller (validate, status)
    → help.service (publish, slug, RBAC)
      → help.mappers → help.dto (stable JSON)
        → Mongoose models (internal)`}
          </Typography>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Deploy topology
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Single Express API (<code>server/</code>), public Next (<code>webapp/</code>), staff Next (<code>admin/</code>
            ). Same auth; RBAC only trusted server-side (blueprint §9).
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
