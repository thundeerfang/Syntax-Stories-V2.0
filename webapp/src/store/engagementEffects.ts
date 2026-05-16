'use client';

import { create } from 'zustand';
import { burstConfettiAtRect } from '@/lib/core/confettiBurst';

export type LightningAnchor = Readonly<{
  top: number;
  left: number;
  width: number;
  height: number;
}>;

function toAnchor(origin: Element | DOMRect): LightningAnchor {
  const rect = origin instanceof DOMRect ? origin : origin.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

type EngagementEffectsState = {
  lightningVisible: boolean;
  lightningAnchor: LightningAnchor | null;
  showLightning: (anchor: LightningAnchor) => void;
  dismissLightning: () => void;
};

export const useEngagementEffectsStore = create<EngagementEffectsState>((set) => ({
  lightningVisible: false,
  lightningAnchor: null,
  showLightning: (anchor) => set({ lightningVisible: true, lightningAnchor: anchor }),
  dismissLightning: () => set({ lightningVisible: false, lightningAnchor: null }),
}));

/** Compact lightning burst above the Respect control. */
export function triggerRespectLightning(origin: Element | DOMRect): void {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  useEngagementEffectsStore.getState().showLightning(toAnchor(origin));
}

/** Local confetti burst on follow / squad join (not unfollow). */
export function triggerFollowConfetti(origin: Element | DOMRect): void {
  const rect = origin instanceof DOMRect ? origin : origin.getBoundingClientRect();
  burstConfettiAtRect(rect);
}
