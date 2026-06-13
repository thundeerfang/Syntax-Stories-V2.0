'use client';

import type { ReactNode } from 'react';
import { Divider, List, ListItem, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import CloudSyncRoundedIcon from '@mui/icons-material/CloudSyncRounded';
import { fetchFederationStatus } from '@/admin/api/management';
import { SecuritySectionCard } from './SecuritySectionCard';
import { AdminStatusBadge } from '@/components/ui/AdminStatusBadge';

export type FederationStatus = Awaited<ReturnType<typeof fetchFederationStatus>>;

function FederationRow({
  icon,
  label,
  detail,
  enabled,
}: {
  icon: ReactNode;
  label: string;
  detail: string;
  enabled: boolean;
}) {
  return (
    <ListItem disablePadding sx={{ py: 0.75 }}>
      <ListItemIcon sx={{ minWidth: 40, color: enabled ? 'primary.main' : 'text.disabled' }}>
        {icon}
      </ListItemIcon>
      <ListItemText
        primary={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="body2" fontWeight={600}>
              {label}
            </Typography>
            <AdminStatusBadge
              label={enabled ? 'Enabled' : 'Off'}
              tone={enabled ? 'success' : 'neutral'}
              emphasis={enabled}
            />
          </Stack>
        }
        secondary={detail}
        secondaryTypographyProps={{ variant: 'body2', sx: { mt: 0.25 } }}
      />
    </ListItem>
  );
}

export function FederationSection({ federation }: { federation: FederationStatus }) {
  return (
    <SecuritySectionCard
      icon={AccountTreeRoundedIcon}
      title="Enterprise federation"
      subtitle="SAML and SCIM integration status"
    >
      <List disablePadding dense>
        <FederationRow
          icon={<CloudSyncRoundedIcon />}
          label="SAML"
          enabled={federation.saml.enabled}
          detail={
            federation.saml.metadataPath
              ? `Metadata at ${federation.saml.metadataPath}`
              : 'No metadata path configured'
          }
        />
        <Divider component="li" sx={{ my: 0.5 }} />
        <FederationRow
          icon={<AccountTreeRoundedIcon />}
          label="SCIM"
          enabled={federation.scim.enabled}
          detail={[
            federation.scim.tokenConfigured ? 'Token configured' : 'Token missing',
            federation.scim.usersPath ? federation.scim.usersPath : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
      </List>
    </SecuritySectionCard>
  );
}
