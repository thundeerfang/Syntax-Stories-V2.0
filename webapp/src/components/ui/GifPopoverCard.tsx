'use client';

import React from 'react';

/** GIF-only hover preview: image only (border/background live on the read-only shell). */
export function GifPopoverCard({
  url,
  onLoad,
}: Readonly<{ url: string; onLoad?: () => void }>) {
  return (
    <img
      src={url}
      alt=""
      onLoad={onLoad}
      className="block max-h-[min(13rem,38vh)] w-auto max-w-[min(340px,92vw)] object-contain"
    />
  );
}
