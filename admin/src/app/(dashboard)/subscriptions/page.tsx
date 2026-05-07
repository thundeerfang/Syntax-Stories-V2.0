'use client';

import {
  Box,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

const demoRows = [
  { id: '1', plan: 'Pro', status: 'active', customer: '—', renews: '—' },
  { id: '2', plan: 'Free', status: 'active', customer: '—', renews: '—' },
];

export default function SubscriptionsPage() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={800} className="tracking-tight" gutterBottom>
          Subscriptions
        </Typography>
        <Typography variant="body2" color="text.secondary" className="max-w-2xl">
          Placeholder UI for Stripe or billing integration. Connect your subscription API to list live plans and
          subscriber status.
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip label="Sample data" size="small" color="default" variant="outlined" />
        <Chip label="API pending" size="small" color="warning" variant="outlined" />
      </Stack>

      <TableContainer
        component={Paper}
        elevation={0}
        className="border border-[var(--color-border)]"
        sx={{ borderColor: 'divider' }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Plan</TableCell>
              <TableCell>Status</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Customer</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Renews</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {demoRows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.plan}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{row.customer}</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{row.renews}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Card elevation={0} className="border border-dashed border-[var(--color-border)]" sx={{ borderColor: 'divider' }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Next step: add server routes (e.g. <code className="text-xs">GET /api/v1/admin/billing/subscriptions</code>)
            and replace this table with fetched data.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
