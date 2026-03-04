'use client';

import { useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

const DotLottieReact = dynamic(
  () => import('@lottiefiles/dotlottie-react').then((m) => m.DotLottieReact),
  { ssr: false }
);

const LOTTIE_SIZE = 20;

interface FireLottieProps {
  /** When true, animation plays; when false, it pauses. Use parent hover state. */
  play?: boolean;
}

export function FireLottie({ play = false }: FireLottieProps) {
  const dotLottieRef = useRef<{ play: () => void; pause: () => void } | null>(null);

  useEffect(() => {
    if (!dotLottieRef.current) return;
    if (play) {
      dotLottieRef.current.play();
    } else {
      dotLottieRef.current.pause();
    }
  }, [play]);

  return (
    <span className="inline-flex shrink-0 pointer-events-none text-foreground" style={{ width: LOTTIE_SIZE, height: LOTTIE_SIZE }}>
      <DotLottieReact
        src="/lottie/Fire.lottie"
        loop
        dotLottieRefCallback={(instance) => {
          dotLottieRef.current = instance;
        }}
        style={{ width: LOTTIE_SIZE, height: LOTTIE_SIZE }}
        renderConfig={{ autoResize: true }}
      />
    </span>
  );
}
