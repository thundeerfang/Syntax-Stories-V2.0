/** Confetti burst centered on a trigger element (follow / join). */
export function burstConfettiAtRect(rect: DOMRect): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;

  void import('canvas-confetti').then(({ default: confetti }) => {
    confetti({
      particleCount: 64,
      spread: 72,
      origin: { x, y },
      startVelocity: 32,
      ticks: 110,
      gravity: 0.95,
      scalar: 0.92,
      colors: ['#7c3aed', '#a855f7', '#c4b5fd', '#fbbf24', '#22c55e', '#ffffff'],
      disableForReducedMotion: true,
    });
  });
}
