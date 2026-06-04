'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import {
  createAdminOperator,
  listRoles,
  sendAdminInviteOtp,
  verifyAdminInviteOtp,
  type AdminOperatorKind,
  type AdminRoleRow,
} from '@/admin';
import { AdminDialog } from '@/components/ui/AdminDialog';
import { AdminDialogInfo } from '@/components/ui/AdminDialogInfo';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { AdminOtpInput } from '@/components/ui/AdminOtpInput';
import { SuccessLottie } from '@/components/ui/SuccessLottie';
import {
  ADMIN_OPERATOR_PASSWORD_RULES,
  isAdminOperatorPasswordValid,
} from '@/lib/auth/passwordPolicy';

export type AddAdminUserDialogProps = {
  open: boolean;
  onClose: () => void;
  token: string | null;
  onCreated: () => void;
};

export function AddAdminUserDialog({ open, onClose, token, onCreated }: AddAdminUserDialogProps) {
  const [step, setStep] = useState(0);
  const [roles, setRoles] = useState<AdminRoleRow[]>([]);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpVersion, setOtpVersion] = useState<number | undefined>();
  const [emailVerifiedToken, setEmailVerifiedToken] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [kind, setKind] = useState<AdminOperatorKind>('admin');
  const [roleId, setRoleId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  const passwordRules = useMemo(
    () =>
      ADMIN_OPERATOR_PASSWORD_RULES.map((rule) => ({
        ...rule,
        ok: rule.test(password),
      })),
    [password]
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void listRoles(token)
      .then((r) => {
        if (!cancelled) {
          setRoles(r.roles);
          setRoleId((prev) => prev || r.roles[0]?.id || '');
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
      setStep(0);
      setEmail('');
      setOtpCode('');
      setOtpVersion(undefined);
      setEmailVerifiedToken('');
      setEmailVerified(false);
      setPassword('');
      setConfirmPassword('');
      setDisplayName('');
      setKind('admin');
      setRoleId('');
      setError(null);
      setLoading(false);
      setOtpSent(false);
    }
  }, [open]);

  async function handleSendOtp() {
    setError(null);
    const norm = email.trim().toLowerCase();
    if (!norm.includes('@')) {
      setError('Enter a valid work email.');
      return;
    }
    setLoading(true);
    try {
      const data = await sendAdminInviteOtp(token, norm);
      setOtpVersion(data.otpVersion);
      setOtpSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send code');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(submittedCode?: string) {
    setError(null);
    const norm = email.trim().toLowerCase();
    const code = (submittedCode ?? otpCode).replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) {
      setError('Enter the 6-digit code from email.');
      return;
    }
    setLoading(true);
    try {
      const data = await verifyAdminInviteOtp(token, {
        email: norm,
        code,
        otpVersion,
      });
      setEmailVerifiedToken(data.emailVerificationToken);
      setEmailVerified(true);
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  function handlePasswordNext() {
    setError(null);
    if (!isAdminOperatorPasswordValid(password)) {
      setError('Password does not meet all requirements.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setStep(2);
  }

  async function handleCreate() {
    setError(null);
    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }
    if (!roleId) {
      setError('Select a role.');
      return;
    }
    if (!emailVerifiedToken) {
      setError('Verify the email first.');
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
        emailVerificationToken: emailVerifiedToken,
      });
      setStep(3);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create admin user');
    } finally {
      setLoading(false);
    }
  }

  const primaryAction = () => {
    if (step === 0) {
      if (!emailVerified) {
        if (otpSent) void handleVerifyOtp();
        else void handleSendOtp();
      }
      return;
    }
    if (step === 1) {
      handlePasswordNext();
      return;
    }
    if (step === 2) {
      void handleCreate();
    }
  };

  const primaryLabel =
    step === 0
      ? otpSent
        ? 'Verify code'
        : 'Send verification code'
      : step === 1
        ? 'Continue'
        : step === 2
          ? 'Create operator'
          : 'Close';

  const primaryDisabled =
    loading ||
    (step === 0 && !email.trim()) ||
    (step === 0 && otpSent && otpCode.replace(/\D/g, '').length !== 6) ||
    (step === 1 && !isAdminOperatorPasswordValid(password)) ||
    (step === 2 && (!displayName.trim() || !roleId));

  const operatorInfo = (
    <AdminDialogInfo title="Work email verification" tooltip="Why we verify email">
      <Typography variant="body2" color="text.secondary">
        We will send a one-time code to confirm this work email is reachable before creating the
        account.
      </Typography>
    </AdminDialogInfo>
  );

  const footer =
    step === 3 ? (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
        {operatorInfo}
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={onClose}>
          Done
        </Button>
      </Stack>
    ) : (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
        {operatorInfo}
        <Box sx={{ flex: 1 }} />
        {step > 0 ? (
          <Button disabled={loading} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            Back
          </Button>
        ) : null}
        <Button variant="outlined" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={primaryAction} disabled={primaryDisabled}>
          {loading ? 'Please wait…' : primaryLabel}
        </Button>
      </Stack>
    );

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title="Add admin operator"
      headerIcon={<PersonAddRoundedIcon />}
      maxWidth="sm"
      hideContentDividers
      footer={footer}
    >
      {loading ? <LinearProgress sx={{ mb: 2, borderRadius: 1 }} /> : null}

      {error ? <AdminFeedbackMessage severity="error" message={error} sx={{ mb: 2, mt: 2 }} /> : null}

      {step === 0 ? (
        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            type="email"
            required
            fullWidth
            size="small"
            variant="outlined"
            placeholder="Work email (e.g. you@company.com)"
            aria-label="Work email"
            value={email}
            disabled={emailVerified || otpSent}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlinedIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
          {otpSent && !emailVerified ? (
            <AdminOtpInput
              value={otpCode}
              onChange={setOtpCode}
              onComplete={(completed) => {
                if (!loading) void handleVerifyOtp(completed);
              }}
              disabled={loading}
              autoFocus
              helperText="Check the operator inbox (and spam folder)."
              aria-label="Email verification code"
            />
          ) : null}
          {emailVerified ? (
            <Chip
              icon={<CheckCircleOutlineIcon />}
              label="Email verified"
              color="success"
              variant="outlined"
              size="small"
            />
          ) : null}
        </Stack>
      ) : null}

      {step === 1 ? (
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Alert severity="info" icon={<SecurityOutlinedIcon />}>
            Two-factor authentication is required for all admin operators. They will complete
            authenticator setup on first sign-in.
          </Alert>
          <TextField
            type="password"
            required
            fullWidth
            size="small"
            variant="outlined"
            placeholder="Initial password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <KeyOutlinedIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            type="password"
            required
            fullWidth
            size="small"
            variant="outlined"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            error={confirmPassword.length > 0 && password !== confirmPassword}
            helperText={
              confirmPassword.length > 0 && password !== confirmPassword
                ? 'Passwords must match'
                : undefined
            }
          />
          <List dense disablePadding>
            {passwordRules.map((rule) => (
              <ListItem key={rule.id} disableGutters sx={{ py: 0.25 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {rule.ok ? (
                    <CheckCircleOutlineIcon color="success" fontSize="small" />
                  ) : (
                    <CancelOutlinedIcon color="disabled" fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={rule.label}
                  primaryTypographyProps={{
                    variant: 'body2',
                    color: rule.ok ? 'success.main' : 'text.secondary',
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Stack>
      ) : null}

      {step === 2 ? (
        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            required
            fullWidth
            size="small"
            variant="outlined"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonOutlineIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl fullWidth size="small">
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
          <FormControl fullWidth required size="small">
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
          <Chip label={email.trim().toLowerCase()} size="small" variant="outlined" />
        </Stack>
      ) : null}

      {step === 3 ? (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <SuccessLottie size={140} />
          <Typography variant="h6" component="p" fontWeight={800} sx={{ mt: 1 }}>
            Operator created
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 320, mx: 'auto' }}>
            {displayName} can sign in with the new password. Two-factor setup is required on first
            login.
          </Typography>
        </Box>
      ) : null}
    </AdminDialog>
  );
}
