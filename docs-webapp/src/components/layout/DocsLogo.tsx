'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

type DocsLogoProps = {
  variant?: 'horizontal' | 'mark';
  href?: string;
  className?: string;
};

const LOGO_INTRINSIC = {
  horizontal: { width: 520, height: 100 },
  mark: { width: 100, height: 100 },
} as const;

export function DocsLogo({ variant = 'horizontal', href = '/', className }: DocsLogoProps) {
  const isMark = variant === 'mark';
  const src = isMark ? '/logo.png' : '/logo_hori.png';
  const { width, height } = isMark ? LOGO_INTRINSIC.mark : LOGO_INTRINSIC.horizontal;

  const img = (
    <Image
      src={src}
      alt="Syntax Stories Docs"
      width={width}
      height={height}
      priority
      className={cn('h-auto object-contain object-left', isMark ? 'w-auto max-h-8' : 'w-full')}
    />
  );

  const wrapperClass = cn('inline-flex min-w-0 items-center leading-none', className);

  if (!href) {
    return <span className={wrapperClass}>{img}</span>;
  }

  return (
    <Link href={href} className={wrapperClass}>
      {img}
    </Link>
  );
}
