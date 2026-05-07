'use client';

import React from 'react';

const PROFILE_CARD_SKELETON_KEYS = ['sk-a', 'sk-b', 'sk-c', 'sk-d', 'sk-e', 'sk-f'] as const;

export function ProfileCardSkeleton(props: Readonly<{ lines?: number }>) {
  const lines = props.lines ?? 3;
  const keys = PROFILE_CARD_SKELETON_KEYS.slice(0, Math.min(lines, PROFILE_CARD_SKELETON_KEYS.length));
  return (
    <div className="border-2 border-border bg-muted/10 p-4 animate-pulse">
      <div className="h-4 w-40 bg-muted rounded" />
      <div className="mt-3 space-y-2">
        {keys.map((key) => (
          <div key={key} className="h-3 w-full bg-muted rounded" />
        ))}
        <div className="h-3 w-2/3 bg-muted rounded" />
      </div>
    </div>
  );
}
