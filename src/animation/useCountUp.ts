/**
 * Count-up for the welcome stats (DESIGN §7.3). Runs inside the screen's GSAP context;
 * with reduced motion it resolves to the final value on the first frame (NFR-11).
 */

import { useEffect, useRef, useState } from 'react';
import { motionEnabledNow } from './useMotionEnabled';

export function useCountUp(target: number, duration = 1.2, start = true): number {
  const [value, setValue] = useState(() => (motionEnabledNow() ? 0 : target));
  const frame = useRef<number>(0);

  useEffect(() => {
    // Reduced motion shows the final number whatever `start` says — otherwise the stats
    // would sit at 0 forever, because callers pass `start = motionEnabled && ready`.
    if (!motionEnabledNow()) {
      setValue(target);
      return;
    }
    if (!start) return;

    const t0 = performance.now();
    const tick = (now: number): void => {
      const p = Math.min(1, (now - t0) / (duration * 1000));
      // ease-out-expo, matching the motion tokens
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setValue(Math.round(target * eased));
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration, start]);

  return value;
}
