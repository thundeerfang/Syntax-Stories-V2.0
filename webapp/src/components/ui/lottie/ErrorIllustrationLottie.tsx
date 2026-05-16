'use client';

import dynamic from 'next/dynamic';
import { cn } from '@/lib/core/utils';


const DotLottieReact = dynamic(
  () => import('@lottiefiles/dotlottie-react').then((m) => m.DotLottieReact),
  { ssr: false },
);

const ERROR_LOTTIE_SRC = {
  '404': '/lottie/404',
  '500': '/lottie/500',
} as const;

export type ErrorIllustrationVariant = keyof typeof ERROR_LOTTIE_SRC;

interface ErrorIllustrationLottieProps {
  variant: ErrorIllustrationVariant;
  className?: string;
  /** Approximate width; height scales with autoResize. */
  widthPx?: number;
}

export function ErrorIllustrationLottie({
  variant,
  className,
  widthPx = 280,
}: Readonly<ErrorIllustrationLottieProps>) {
  return (
    <div
      className={cn('mx-auto w-full shrink-0', className)}
      style={{ maxWidth: widthPx, height: widthPx }}
    >
      <DotLottieReact
        src={ERROR_LOTTIE_SRC[variant]}
        loop
        autoplay
        style={{ width: '100%', height: '100%', display: 'block' }}
        renderConfig={{ autoResize: true }}
      />
    </div>
  );
}
