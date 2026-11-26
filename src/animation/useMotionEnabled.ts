/**
 * One reduced-motion flag for the whole app (NFR-11).
 *
 * Reads `prefers-reduced-motion` once and keeps it live; every GSAP timeline, Motion variant
 * and count-up goes through this hook. Components must never check matchMedia themselves —
 * scattered checks are how a path ends up animated by accident.
 *
 * When animation is disabled, callers render final states immediately (no tween, no parallax,
 * no counters — DESIGN §7.5).
 */

import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function useMotionEnabled(): boolean {
  const [enabled, setEnabled] = useState(() => !prefersReducedMotion());

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const onChange = (): void => setEnabled(!media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return enabled;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(QUERY).matches;
}

/** For non-component code (timers, imperative helpers) that still needs the flag. */
export function motionEnabledNow(): boolean {
  return !prefersReducedMotion();
}
