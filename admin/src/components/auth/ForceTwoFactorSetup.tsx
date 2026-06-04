'use client';

import { Alert, Box, Button, Typography } from '@mui/material';
import Link from 'next/link';

/**
 * Blocks dashboard when operator has 2FA enabled but no authenticator secret yet.
 */
export function ForceTwoFactorSetup() {
  return (
    <Box
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center"
      sx={{ maxWidth: 480, mx: 'auto' }}
    >
      <Alert severity="warning" sx={{ width: '100%' }}>
        Two-factor authentication must be configured before using the admin dashboard.
      </Alert>
      <Typography color="text.secondary">
        Set up an authenticator app using the platform account security settings, then sign in
        again.
      </Typography>
      <Button component={Link} href="/login" variant="outlined">
        Back to sign in
      </Button>
    </Box>
  );
}
