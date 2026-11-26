/**
 * Page transition hook: screens render their content and let `usePageTransition` supply
 * the `<motion.main>` props, so every route inherits the same enter/exit (DESIGN §7.2).
 * Mounted inside `<AnimatePresence mode="wait">` in `router.tsx`.
 */

import { pageVariants } from './variants';

export function usePageTransition(): {
  variants: typeof pageVariants;
  initial: 'initial';
  animate: 'enter';
  exit: 'exit';
} {
  return { variants: pageVariants, initial: 'initial', animate: 'enter', exit: 'exit' };
}
