'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { getUserFollows, type AdminUserFollowItem } from '@/admin/api/management';
import { AdminDialog } from '@/components/ui/AdminDialog';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { formatUserDetailDate } from '@/lib/users/formatUserDetailDate';
import { userProfilePath } from '@/lib/users/userProfilePath';

type UserFollowListDialogProps = {
  open: boolean;
  onClose: () => void;
  token: string | null;
  userRef: string;
  type: 'followers' | 'following';
};

export function UserFollowListDialog({
  open,
  onClose,
  token,
  userRef,
  type,
}: UserFollowListDialogProps) {
  const [items, setItems] = useState<AdminUserFollowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !open) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getUserFollows(token, userRef, type);
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load list');
    } finally {
      setLoading(false);
    }
  }, [token, userRef, type, open]);

  useEffect(() => {
    if (open) void load();
  }, [load, open]);

  const title = type === 'followers' ? 'Followers' : 'Following';

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      secondaryButton={{ label: 'Close', onClick: onClose }}
    >
      <Stack spacing={2}>
        {error ? <AdminFeedbackMessage severity="error" message={error} onClose={() => setError(null)} /> : null}
        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading…
          </Typography>
        ) : items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No {type} yet.
          </Typography>
        ) : (
          <List disablePadding dense>
            {items.map((item) => (
              <ListItem key={item.id} disablePadding>
                <ListItemButton component={Link} href={userProfilePath(item.id)} onClick={onClose}>
                  <ListItemAvatar>
                    <Avatar src={item.profileImg} alt={item.fullName} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={item.fullName}
                    secondary={`@${item.username}${item.followedAt ? ` · ${formatUserDetailDate(item.followedAt)}` : ''}`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Stack>
    </AdminDialog>
  );
}
