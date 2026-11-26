/**
 * One-shot GSAP mount choreography for a screen (DESIGN §7.1/§7.3), done the glitch-free way:
 *
 * 1. **Before first paint** (`useLayoutEffect`): a plain `useEffect` paints the final state
 *    first, then GSAP snaps elements back to their start and animates — a visible flash.
 * 2. **CSS transitions off while GSAP drives an element**: cards and buttons have hover
 *    transitions on `transform`; if those stay on, the browser re-transitions every GSAP frame
 *    and elements lag or end stuck mid-way. `reveal()` disables them for the tween and clears
 *    every inline style it set when done, so hover effects work again afterwards.
 * 3. Scoped to the screen root with `gsap.context()` and reverted on unmount (AGENTS §3.5).
 * 4. Reduced motion: nothing runs; elements are simply in their final state.
 * 5. While any entrance is running, `<html data-animating>` is set — the e2e suite waits on it
 *    instead of guessing from frame samples (which mislead when a slow machine drops frames).
 */

import { useLayoutEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { useMotionEnabled } from './useMotionEnabled';

export interface Reveal {
  /** `gsap.from` with transitions suspended and props cleared on completion. */
  reveal: (targets: gsap.TweenTarget, vars: gsap.TweenVars, position?: gsap.Position) => void;
  timeline: gsap.core.Timeline;
}

const CLEAR = 'transform,opacity,transition,visibility';

let running = 0;
function track(delta: 1 | -1): void {
  running = Math.max(0, running + delta);
  if (running) document.documentElement.dataset.animating = String(running);
  else delete document.documentElement.dataset.animating;
}

export function useMountAnimation(
  root: RefObject<HTMLElement | null>,
  build: (r: Reveal) => void,
  deps: readonly unknown[],
): void {
  const enabled = useMotionEnabled();

  useLayoutEffect(() => {
    if (!enabled || !root.current) return;
    let active = true;
    track(1);
    const done = (): void => {
      if (active) track(-1);
      active = false;
    };
    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: done });
      const reveal: Reveal['reveal'] = (targets, vars, position) => {
        const els = gsap.utils.toArray<HTMLElement>(targets);
        if (!els.length) return;
        gsap.set(els, { transition: 'none' });
        timeline.from(
          els,
          {
            ...vars,
            immediateRender: true,
            onComplete: () => {
              gsap.set(els, { clearProps: CLEAR });
            },
          },
          position,
        );
      };
      build({ reveal, timeline });
      if (!timeline.getChildren().length) done();
    }, root);
    return () => {
      ctx.revert();
      done();
    };
    // `build` is intentionally excluded: screens pass an inline function; `deps` decides re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);
}
