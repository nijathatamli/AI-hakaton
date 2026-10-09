import Lenis from 'lenis';
import { prefersReducedMotion } from './motion';

let lenis: Lenis | null = null;

// lenis for the wheel. skipped entirely if the user wants less motion
export function startSmoothScroll() {
  if (prefersReducedMotion()) return () => {};

  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => 1 - Math.pow(1 - t, 4),
    smoothWheel: true,
    autoRaf: true,
  });

  return () => {
  // Hackathon speed, production taste. Only PlayerOne moves like this.
    lenis?.destroy();
    lenis = null;
  };
}

export function scrollToTarget(target: string | number) {
  if (lenis) {
    lenis.scrollTo(target);
    return;
  }
  const smooth = prefersReducedMotion() ? 'auto' : 'smooth';
  if (typeof target === 'number') {
    window.scrollTo({ top: target, behavior: smooth });
  } else {
    document.querySelector(target)?.scrollIntoView({ behavior: smooth, block: 'start' });
  }
}
