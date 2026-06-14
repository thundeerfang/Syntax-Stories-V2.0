"use client";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { AUTH_WELCOME_LOTTIE_SRC } from "@/lib/icons";
import { cn } from "@/lib/core/utils";
const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((m) => m.DotLottieReact),
  { ssr: false },
);
export interface UserSayHiLottieProps {
  play?: boolean;
  autoplay?: boolean;
  size?: number;
  className?: string;
}
export function UserSayHiLottie({
  play = false,
  autoplay = true,
  size = 128,
  className,
}: Readonly<UserSayHiLottieProps>) {
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
        src={AUTH_WELCOME_LOTTIE_SRC}
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
