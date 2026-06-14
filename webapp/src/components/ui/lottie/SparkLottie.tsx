"use client";
import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((m) => m.DotLottieReact),
  { ssr: false },
);
type DotLottieHandle = {
  play: () => void;
  pause: () => void;
  readonly isLoaded: boolean;
};
export interface SparkLottieProps {
  size?: number;
  play?: boolean;
}
export function SparkLottie({
  play = false,
  size = 28,
}: Readonly<SparkLottieProps>) {
  const instRef = useRef<DotLottieHandle | null>(null);
  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
  }, [play]);
  const syncInstance = useCallback(() => {
    const inst = instRef.current;
    if (!inst?.isLoaded) return false;
    if (playRef.current) {
      inst.play();
    } else {
      inst.pause();
    }
    return true;
  }, []);
  useEffect(() => {
    let raf = 0;
    let tries = 0;
    const run = () => {
      if (syncInstance()) return;
      tries += 1;
      if (tries < 120) raf = requestAnimationFrame(run);
    };
    run();
    return () => cancelAnimationFrame(raf);
  }, [play, syncInstance]);
  return (
    <span
      className="inline-flex shrink-0 pointer-events-none overflow-hidden"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      <DotLottieReact
        src="/lottie/Spark.lottie"
        loop
        autoplay={false}
        dotLottieRefCallback={(instance) => {
          instRef.current = instance as DotLottieHandle;
          requestAnimationFrame(() => {
            let t = 0;
            const r = () => {
              if (syncInstance() || t++ > 120) return;
              requestAnimationFrame(r);
            };
            r();
          });
        }}
        style={{ width: size, height: size, display: "block" }}
        renderConfig={{ autoResize: true }}
      />
    </span>
  );
}
