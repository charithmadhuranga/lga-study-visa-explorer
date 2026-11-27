/**
 * Shared motion variants — the single vocabulary for `motion` (Motion for React).
 * GSAP handles mount choreography instead (DESIGN.md §7.1): never both on one property.
 */

import type { Transition, Variants } from 'motion/react';

export const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

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
