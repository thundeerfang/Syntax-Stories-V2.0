'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { listAdminOperators, patchAdminOperator, type AdminOperatorRow } from '@/admin';
import { AddAdminUserDialog } from './AddAdminUserDialog';

const kindLabel: Record<string, string> = {
  staff: 'Staff',
  admin: 'Admin',
  super_admin: 'Super admin',
};

export function AdminTeamPanel({ token }: { token: string | null }) {
  const [items, setItems] = useState<AdminOperatorRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const r = await listAdminOperators(token);
      setItems(r.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load admin users');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function toggleActive(row: AdminOperatorRow, next: boolean) {
    if (!token) return;
    setBusyId(row.id);
    setError(null);
    try {
      await patchAdminOperator(token, row.id, { isActive: next });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  if (!token) return null;

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ borderRadius: 2 }}
        >
          Add admin user
        </Button>
      </Box>

      {error ? (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      ) : null}

      <TableContainer
        component={Paper}
        elevation={0}
        className="border border-[var(--color-border)]"
        sx={{ borderColor: 'divider', borderRadius: 2 }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Operator</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Email</TableCell>
              <TableCell>Type</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Role</TableCell>
              <TableCell align="right">Active</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Loading…
                  </Typography>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    No dashboard operators yet. Use &quot;Add admin user&quot; after roles exist in the
                    system.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <TableRow key={row.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell>
                    <Typography fontWeight={600}>{row.displayName}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      User ID {row.userId}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{row.email}</TableCell>
                  <TableCell>
                    <Chip size="small" label={kindLabel[row.kind] ?? row.kind} variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    {row.roleName ?? '—'}
                  </TableCell>
                  <TableCell align="right">
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={row.isActive}
                          disabled={busyId === row.id}
                          onChange={(_, v) => void toggleActive(row, v)}
                        />
                      }
                      label=""
                      sx={{ mr: 0 }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <AddAdminUserDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        token={token}
        onCreated={() => void refresh()}
      />
    </Stack>
  );
}
