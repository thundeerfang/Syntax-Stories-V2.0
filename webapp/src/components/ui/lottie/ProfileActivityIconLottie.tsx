'use client';

import dynamic from 'next/dynamic';

const DotLottieReact = dynamic(
  () => import('@lottiefiles/dotlottie-react').then((m) => m.DotLottieReact),
  { ssr: false },
);

const ACTIVITY_LOTTIE_SRC = `/svg/${encodeURIComponent('Activity Icon Animation.lottie')}`;

export interface ProfileActivityIconLottieProps {
  size?: number;
}

export function ProfileActivityIconLottie({ size = 22 }: Readonly<ProfileActivityIconLottieProps>) {
  return (
    <span
      className="inline-flex shrink-0 pointer-events-none overflow-hidden"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      aria-hidden
    >
      <DotLottieReact
        src={ACTIVITY_LOTTIE_SRC}
        loop
        autoplay
        style={{ width: size, height: size, display: 'block' }}
        renderConfig={{ autoResize: true }}
      />
    </span>
  );
}
