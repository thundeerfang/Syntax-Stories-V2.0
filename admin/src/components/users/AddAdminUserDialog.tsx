'use client';

import { useEffect, useState } from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AdminDialog } from '@/components/ui/AdminDialog';
import {
  createAdminOperator,
  listRoles,
  type AdminOperatorKind,
  type AdminRoleRow,
} from '@/admin';

export type AddAdminUserDialogProps = {
  open: boolean;
  onClose: () => void;
  token: string;
  onCreated: () => void;
};

export function AddAdminUserDialog({ open, onClose, token, onCreated }: AddAdminUserDialogProps) {
  const [roles, setRoles] = useState<AdminRoleRow[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [kind, setKind] = useState<AdminOperatorKind>('admin');
  const [roleId, setRoleId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void listRoles(token)
      .then((r) => {
        if (!cancelled) {
          setRoles(r.roles);
          setRoleId((prev) => {
            if (prev) return prev;
            const first = r.roles[0];
            return first ? first.id : '';
          });
        }
      })
      .catch(() => {
        if (!cancelled) setRoles([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, token]);

  useEffect(() => {
    if (!open) {
      setEmail('');
      setPassword('');
      setDisplayName('');
      setKind('admin');
      setRoleId('');
      setError(null);
      setLoading(false);
    }
  }, [open]);

  async function submit() {
    setError(null);
    if (!email.trim() || !password || password.length < 8) {
      setError('Email and password (at least 8 characters) are required.');
      return;
    }
    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }
    if (!roleId) {
      setError('Select a role. Create roles in the database if none appear.');
      return;
    }
    setLoading(true);
    try {
      await createAdminOperator(token, {
        email: email.trim().toLowerCase(),
        password,
        displayName: displayName.trim(),
        kind,
        roleId,
      });
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create admin user');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title="Add admin user"
      maxWidth="sm"
      primaryButton={{ label: 'Create', onClick: () => void submit(), disabled: loading }}
      secondaryButton={{ label: 'Cancel', onClick: onClose, disabled: loading }}
    >
      <Stack spacing={2} sx={{ pt: 0.5 }}>
        {error ? (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        ) : null}
        <TextField
          label="Work email"
          type="email"
          required
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
        />
        <TextField
          label="Initial password"
          type="password"
          required
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          helperText="Minimum 8 characters. Share securely with the operator."
          autoComplete="new-password"
        />
        <TextField
          label="Display name"
          required
          fullWidth
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <FormControl fullWidth>
          <InputLabel id="add-admin-kind">Account type</InputLabel>
          <Select
            labelId="add-admin-kind"
            label="Account type"
            value={kind}
            onChange={(e) => setKind(e.target.value as AdminOperatorKind)}
          >
            <MenuItem value="staff">Staff</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="super_admin">Super admin</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth required>
          <InputLabel id="add-admin-role">Role</InputLabel>
          <Select
            labelId="add-admin-role"
            label="Role"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
          >
            {roles.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.name} (level {r.level})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    </AdminDialog>
  );
}
