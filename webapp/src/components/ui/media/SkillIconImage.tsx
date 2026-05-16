'use client';

import { useEffect, useState } from 'react';
import { Tag } from 'lucide-react';
import { SkillIconSkeleton } from '../feedback/Skeleton';
import { cn } from '@/lib/core/utils';

export type SkillIconImageProps = Readonly<{
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
}>;

/** Skill icon with inline skeleton until the remote asset loads. */
export function SkillIconImage({ src, alt = '', className, imgClassName }: SkillIconImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setLoaded(false);
    setFailed(!src);
  }, [src]);

  if (!src || failed) {
    return <Tag className={cn('size-4 shrink-0 text-muted-foreground', className)} aria-hidden />;
  }

  return (
    <span className={cn('relative inline-flex size-full items-center justify-center', className)}>
      {!loaded ? (
        <SkillIconSkeleton className="absolute inset-0" />
      ) : null}
      <img
        src={src}
        alt={alt}
        loading="eager"
        decoding="async"
        fetchPriority="high"
        className={cn(
          'size-full object-contain transition-opacity duration-150',
          loaded ? 'opacity-100' : 'opacity-0',
          imgClassName
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </span>
  );
}
