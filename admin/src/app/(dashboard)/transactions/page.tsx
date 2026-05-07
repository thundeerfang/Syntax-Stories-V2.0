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
  { id: 'txn_001', date: '—', amount: '—', type: 'Payment', status: 'Sample' },
  { id: 'txn_002', date: '—', amount: '—', type: 'Refund', status: 'Sample' },
];

export default function TransactionsPage() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={800} className="tracking-tight" gutterBottom>
          Transactions
        </Typography>
        <Typography variant="body2" color="text.secondary" className="max-w-2xl">
          Placeholder for payment and invoice history. Hook into Stripe events or your ledger to populate this
          view.
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip label="Sample data" size="small" variant="outlined" />
        <Chip label="Read-only preview" size="small" color="info" variant="outlined" />
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
              <TableCell>ID</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Date</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Type</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {demoRows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">
                    {row.id}
                  </Typography>
                </TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{row.date}</TableCell>
                <TableCell>{row.amount}</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{row.type}</TableCell>
                <TableCell>{row.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Card elevation={0} className="border border-dashed border-[var(--color-border)]" sx={{ borderColor: 'divider' }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Suggested fields: id, createdAt, currency, amount, type, status, userId. Paginate when volume grows.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
