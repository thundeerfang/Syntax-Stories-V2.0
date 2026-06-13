'use client';

import Link from 'next/link';
import { Avatar, Button, Typography } from '@mui/material';
import { userProfilePath } from '@/lib/users/userProfilePath';
import { resolveProfileMediaUrl } from '@/lib/users/resolveProfileMediaUrl';

export type BlogAuthorButtonProps = {
  authorRef: string | null;
  username: string;
  fullName?: string;
  profileImg?: string | null;
};

export function BlogAuthorButton({
  authorRef,
  username,
  fullName,
  profileImg,
}: BlogAuthorButtonProps) {
  if (!authorRef) {
    return (
      <Button variant="outlined" size="small" disabled sx={{ borderRadius: 999, textTransform: 'none' }}>
        <Avatar sx={{ width: 28, height: 28, mr: 1 }}>{username.charAt(0).toUpperCase()}</Avatar>
        @{username}
      </Button>
    );
  }

  const handle = username.trim() || 'user';
  const avatarSrc = resolveProfileMediaUrl(profileImg, handle);

  return (
    <Button
      component={Link}
      href={userProfilePath(authorRef)}
      variant="outlined"
      size="small"
      sx={{
        borderRadius: 999,
        textTransform: 'none',
        pl: 0.75,
        pr: 1.5,
        py: 0.5,
        gap: 1,
      }}
    >
      <Avatar src={avatarSrc} alt={fullName || username} sx={{ width: 28, height: 28 }}>
        {handle.charAt(0).toUpperCase()}
      </Avatar>
      <Typography component="span" variant="body2" fontWeight={700}>
        @{username}
      </Typography>
    </Button>
  );
}
