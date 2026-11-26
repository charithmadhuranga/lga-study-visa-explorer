/** Transient confirmation pill (FR-15): navy/gold, ~2 s, `aria-live="polite"`. */

import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { useSession } from '../store/session';
import { toastIn } from '../animation/variants';
import { useMotionEnabled } from '../animation/useMotionEnabled';
import { Icon } from './Icon';

const VISIBLE_MS = 2000;

export function Toast(): React.JSX.Element {
  const message = useSession((s) => s.toast);
  const dismiss = useSession((s) => s.dismissToast);
  const enabled = useMotionEnabled();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(dismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, dismiss]);

  return (
    <div role="status" aria-live="polite">
      <AnimatePresence>
        {message && (
          <motion.div
            key={message}
            className="toast"
            variants={enabled ? toastIn : undefined}
            initial={enabled ? 'initial' : false}
            animate={enabled ? 'enter' : { opacity: 1, y: 0 }}
            exit={enabled ? 'exit' : { opacity: 0 }}
          >
            <Icon name="check" />
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
