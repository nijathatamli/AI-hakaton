// one set of curves for the whole site, dont add new ones inline
export const EASE_OUT = [0.23, 1, 0.32, 1] as const; // things entering
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const; // things morphing on screen

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const hasFinePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
