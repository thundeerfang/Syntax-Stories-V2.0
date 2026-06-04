'use client';

import dynamic from 'next/dynamic';

const DotLottieReact = dynamic(
  () => import('@lottiefiles/dotlottie-react').then((m) => m.DotLottieReact),
  { ssr: false }
);

export type SuccessLottieProps = {
  size?: number;
};

export function SuccessLottie({ size = 120 }: SuccessLottieProps) {
  return (
    <BoxCenter size={size}>
      <DotLottieReact
        src="/lottie/Spark.lottie"
        autoplay
        loop={false}
        style={{ width: size, height: size }}
        renderConfig={{ autoResize: true }}
      />
    </BoxCenter>
  );
}

function BoxCenter({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'flex',
        width: size,
        height: size,
        margin: '0 auto',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </span>
  );
}
