import type { Dispatch, KeyboardEvent, SetStateAction } from 'react';

export type CropPercent = { x: number; y: number };

const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

/**
 * Arrow keys adjust `react-easy-crop` position (same axes as dragging the image).
 * Shift + arrow uses a larger step. Returns true if the event was handled.
 */
export function handleCropperArrowKeys(
  e: KeyboardEvent,
  setCrop: Dispatch<SetStateAction<CropPercent>>
): boolean {
  if (!ARROW_KEYS.has(e.key)) return false;
  e.preventDefault();
  e.stopPropagation();
  const step = e.shiftKey ? 4 : 1;
  setCrop((prev) => {
    let { x, y } = prev;
    switch (e.key) {
      case 'ArrowLeft':
        x -= step;
        break;
      case 'ArrowRight':
        x += step;
        break;
      case 'ArrowUp':
        y -= step;
        break;
      case 'ArrowDown':
        y += step;
        break;
      default:
        return prev;
    }
    return { x, y };
  });
  return true;
}
