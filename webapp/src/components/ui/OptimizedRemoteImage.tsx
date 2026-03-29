'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

type Props = Readonly<{
  src: string;
  alt: string;
  blurDataUrl?: string | null;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
}>;

/**
 * Uses `next/image` with blur placeholder when `blurDataUrl` is set (e.g. from Sharp on upload).
 * Falls back to `<img>` for non-http(s) sources or when no blur is available.
 */
export function OptimizedRemoteImage({
  src,
  alt,
  blurDataUrl,
  className,
  fill,
  width,
  height,
  sizes,
  priority,
}: Props) {
  const isRemote = src.startsWith('http://') || src.startsWith('https://');
  const useNextBlur = Boolean(blurDataUrl && isRemote);

  if (!useNextBlur) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn(fill && 'absolute inset-0 h-full w-full', className)}
        width={width}
        height={height}
        decoding="async"
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={cn('object-cover', className)}
        sizes={sizes}
        placeholder="blur"
        blurDataURL={blurDataUrl ?? ''}
        priority={priority}
      />
    );
  }

  if (width == null || height == null) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn(className)}
        decoding="async"
        sizes={sizes}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes={sizes}
      placeholder="blur"
      blurDataURL={blurDataUrl ?? ''}
      priority={priority}
    />
  );
}
