"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });
export interface TestAccountLottieProps {
  size?: number;
  className?: string;
}
export function TestAccountLottie({
  size = 36,
  className,
}: Readonly<TestAccountLottieProps>) {
  const [data, setData] = useState<object | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetch("/svg/icons8-test-account.json")
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
      className={className}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      aria-hidden
    >
      {data ? (
        <Lottie
          animationData={data}
          loop
          style={{ width: size, height: size }}
        />
      ) : (
        <span className="block size-full animate-pulse bg-muted/60" />
      )}
    </span>
  );
}
