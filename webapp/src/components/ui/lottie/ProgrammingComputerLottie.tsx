"use client";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/core/utils";
const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((m) => m.DotLottieReact),
  { ssr: false },
);
const LOTTIE_SRC = "/lottie/Programming%20Computer.lottie";
export interface ProgrammingComputerLottieProps {
  play?: boolean;
  autoplay?: boolean;
  size?: number;
  className?: string;
}
export function ProgrammingComputerLottie({
  play = false,
  autoplay = true,
  size = 128,
  className,
}: Readonly<ProgrammingComputerLottieProps>) {
  const dotLottieRef = useRef<{
    play: () => void;
    pause: () => void;
  } | null>(null);
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
      className={cn("pointer-events-none inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <DotLottieReact
        src={LOTTIE_SRC}
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
