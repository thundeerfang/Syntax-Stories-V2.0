'use client';

import { useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

const DotLottieReact = dynamic(
  () => import('@lottiefiles/dotlottie-react').then((m) => m.DotLottieReact),
  { ssr: false }
);

const DEFAULT_SIZE = 20;

interface RocketLottieProps {
  /** When true, animation plays; when false, it pauses. Use parent hover state. */
  play?: boolean;
  /** Page headers: loop continuously without hover. */
  autoplay?: boolean;
  size?: number;
}

export function RocketLottie({
  play = false,
  autoplay = false,
  size = DEFAULT_SIZE,
}: Readonly<RocketLottieProps>) {
  const dotLottieRef = useRef<{ play: () => void; pause: () => void } | null>(null);

  useEffect(() => {
    if (!dotLottieRef.current) return;
    if (autoplay || play) {
      dotLottieRef.current.play();
    } else {
      dotLottieRef.current.pause();
    }
  }, [play, autoplay]);

  return (
    <span
      className="pointer-events-none inline-flex shrink-0 text-foreground"
      style={{ width: size, height: size }}
    >
      <DotLottieReact
        src="/lottie/Rocket.lottie"
        loop
        autoplay={autoplay}
        dotLottieRefCallback={(instance) => {
          dotLottieRef.current = instance;
          if (autoplay) instance?.play();
        }}
        style={{ width: size, height: size }}
        renderConfig={{ autoResize: true }}
      />
    </span>
  );
}
