'use client';

import dynamic from 'next/dynamic';

const DotLottieReact = dynamic(
  () => import('@lottiefiles/dotlottie-react').then((m) => m.DotLottieReact),
  { ssr: false }
);

interface StreakFireLottieProps {
  play?: boolean;
  size?: number;
}

export function StreakFireLottie({ play = false, size = 28 }: Readonly<StreakFireLottieProps>) {
  return (
    <span
      className="inline-flex shrink-0 pointer-events-none overflow-hidden"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      <DotLottieReact
        src="/lottie/StreakFire.lottie"
        loop
        autoplay={play}
        style={{ width: size, height: size, display: 'block' }}
        renderConfig={{ autoResize: true }}
      />
    </span>
  );
}
