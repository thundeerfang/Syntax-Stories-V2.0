/** Magic UI–style side confetti cannons (https://magicui.design/docs/components/confetti). */
export function fireConfettiSideCannons(durationMs = 3000): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  void import('canvas-confetti').then(({ default: confetti }) => {
    const end = Date.now() + durationMs;
    const colors = ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1', '#7c3aed', '#ffffff'];

    const frame = () => {
      if (Date.now() > end) return;

      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors,
        disableForReducedMotion: true,
      });

      requestAnimationFrame(frame);
    };

    frame();
  });
}
