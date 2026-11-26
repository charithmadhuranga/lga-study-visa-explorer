/**
 * Shared motion variants — the single vocabulary for `motion` (Motion for React).
 * GSAP handles mount choreography instead (DESIGN.md §7.1): never both on one property.
 */

import type { Transition, Variants } from 'motion/react';

export const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  // The old page leaves instantly and only the new one fades in: fading a large page out first
  // doubles the compositing work per navigation (painful on GPU-less office PCs) and delayed
  // the scroll-to-top behind it.
  enter: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT_EXPO } },
  exit: { opacity: 0, transition: { duration: 0 } },
};

/** Parent variant set for staggered grids (DESIGN §7.3: ≤12 animated children). */
export const staggerParent = (n = 0.06): Variants => ({
  initial: {},
  enter: { transition: { staggerChildren: n } },
});

export const itemVariants: Variants = {
  initial: { opacity: 0, y: 24 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT_EXPO } },
};

export const spring: Transition = { type: 'spring', stiffness: 420, damping: 34 };

export const springSoft: Transition = { type: 'spring', stiffness: 260, damping: 30 };

export const toastIn = {
  initial: { opacity: 0, y: 24 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT_EXPO } },
  exit: { opacity: 0, y: 8, transition: { duration: 0.2, ease: 'easeIn' } },
} satisfies Variants;
