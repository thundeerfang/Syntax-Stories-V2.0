'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/core/utils';


const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

const GITHUB_LOTTIE_SRC = '/lottie/icons8-github.json';

export interface GithubConnectLottieProps {
  size?: number;
  className?: string;
}

/** Animated GitHub-style mascot from Icons8 Lottie JSON (hosted under `/public/lottie`). */
export function GithubConnectLottie({ size = 120, className }: Readonly<GithubConnectLottieProps>) {
  const [data, setData] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(GITHUB_LOTTIE_SRC)
      .then((r) => r.json())
      .then((json: object) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <span
      className={cn('inline-flex items-center justify-center', className)}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      aria-hidden
    >
      {data ? (
        <Lottie animationData={data} loop style={{ width: size, height: size }} />
      ) : (
        <span className="block size-full animate-pulse bg-muted/60" />
      )}
    </span>
  );
}
