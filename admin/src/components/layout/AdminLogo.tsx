'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Box } from '@mui/material';

type AdminLogoProps = {
  variant?: 'horizontal' | 'mark';
  href?: string;
  height?: number;
  collapsed?: boolean;
};

export function AdminLogo({
  variant = 'horizontal',
  href = '/',
  height = 32,
  collapsed = false,
}: AdminLogoProps) {
  const src = collapsed || variant === 'mark' ? '/logo.png' : '/logo_hori.png';
  const w = collapsed || variant === 'mark' ? height : Math.round(height * 5.2);

  const img = (
    <Image
      src={src}
      alt="Syntax Stories Admin"
      width={w}
      height={height}
      priority
      style={{
        height,
        width: 'auto',
        minWidth: collapsed || variant === 'mark' ? height : Math.round(height * 3.5),
        maxWidth: w,
        objectFit: 'contain',
      }}
    />
  );

  if (!href) {
    return <Box sx={{ display: 'flex', alignItems: 'center', lineHeight: 0 }}>{img}</Box>;
  }

  return (
    <Box
      component={Link}
      href={href}
      sx={{
        display: 'flex',
        alignItems: 'center',
        lineHeight: 0,
        textDecoration: 'none',
        flexShrink: 0,
      }}
    >
      {img}
    </Box>
  );
}
