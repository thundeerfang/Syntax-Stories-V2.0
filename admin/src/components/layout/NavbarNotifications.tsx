'use client';

import { useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Menu,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import { navbarIconButtonSx } from './navbarIconButtonSx';

const PLACEHOLDER_NOTIFICATIONS = [
  {
    id: '1',
    title: 'Session active',
    body: 'Your operator session is healthy.',
    unread: false,
  },
];

export function NavbarNotifications() {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const unreadCount = PLACEHOLDER_NOTIFICATIONS.filter((n) => n.unread).length;

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          aria-label="Notifications"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={navbarIconButtonSx(theme)}
        >
          <Badge
            badgeContent={unreadCount > 0 ? unreadCount : undefined}
            color="primary"
            overlap="circular"
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.65rem',
                height: 16,
                minWidth: 16,
              },
            }}
          >
            <NotificationsNoneRoundedIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            elevation: 8,
            sx: {
              mt: 1,
              width: 340,
              maxWidth: 'calc(100vw - 24px)',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
            },
          },
        }}
      >
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Recent activity for your operator account
          </Typography>
        </Box>

        {PLACEHOLDER_NOTIFICATIONS.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>
            No notifications yet
          </Typography>
        ) : (
          <List dense disablePadding sx={{ maxHeight: 280, overflow: 'auto', px: 1, pb: 1 }}>
            {PLACEHOLDER_NOTIFICATIONS.map((n) => (
              <ListItem key={n.id} sx={{ borderRadius: 1.5, px: 1 }}>
                <ListItemAvatar sx={{ minWidth: 40 }}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                    }}
                  >
                    <NotificationsNoneRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={n.title}
                  secondary={n.body}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Menu>
    </>
  );
}
