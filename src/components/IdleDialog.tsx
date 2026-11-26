/**
 * Idle reset dialog (FR-12): 4 minutes without input → this dialog with a 20-second
 * countdown, then the session clears and the app returns to the welcome screen.
 * "Continue consultation" cancels; any key or click while open restarts the countdown.
 * Focus is trapped on the single action and returned when the dialog closes (DESIGN §8).
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { IDLE_DIALOG_MS, useSession } from '../store/session';
import { useMotionEnabled } from '../animation/useMotionEnabled';

export function IdleDialog({ onReset }: { onReset: () => void }): React.JSX.Element | null {
  const idle = useSession((s) => s.idle);
  const close = useSession((s) => s.closeIdleDialog);
  const [remaining, setRemaining] = useState(IDLE_DIALOG_MS / 1000);

  useEffect(() => {
    if (idle !== 'dialog') {
      setRemaining(IDLE_DIALOG_MS / 1000);
      return;
    }

    let left = IDLE_DIALOG_MS / 1000;
    const tick = setInterval(() => {
      left -= 1;
      setRemaining(left);
      if (left <= 0) {
        clearInterval(tick);
        onReset();
      }
    }, 1000);

    // Any input while the dialog is open restarts its countdown (reference parity).
    const poke = (): void => {
      left = IDLE_DIALOG_MS / 1000;
      setRemaining(left);
    };
    window.addEventListener('pointerdown', poke);
    window.addEventListener('keydown', poke);

    return () => {
      clearInterval(tick);
      window.removeEventListener('pointerdown', poke);
      window.removeEventListener('keydown', poke);
    };
  }, [idle, onReset]);

  if (idle !== 'dialog') return null;

  return <IdlePanel remaining={remaining} onContinue={close} />;
}

function IdlePanel({
  remaining,
  onContinue,
}: {
  remaining: number;
  onContinue: () => void;
}): React.JSX.Element {
  const enabled = useMotionEnabled();
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    button.current?.focus();
    // Single focusable element: keep Tab on it.
    const trap = (event: KeyboardEvent): void => {
      if (event.key === 'Tab') {
        event.preventDefault();
        button.current?.focus();
      }
      if (event.key === 'Escape') onContinue();
    };
    window.addEventListener('keydown', trap);
    return () => {
      window.removeEventListener('keydown', trap);
      previous?.focus?.();
    };
  }, [onContinue]);

  return (
    <motion.div
      className="idle-backdrop"
      initial={enabled ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="idle-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="idle-title"
        aria-describedby="idle-desc"
        initial={enabled ? { opacity: 0, scale: 0.96 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="eyebrow">Ready for the next visitor?</div>
        <h2 id="idle-title">This consultation will reset</h2>
        <p id="idle-desc">
          The screen returns to the welcome page and clears the shortlist and filters, so the next
          customer starts fresh.
        </p>
        <div className="idle-count" aria-live="polite">
          {remaining}
        </div>
        <button ref={button} className="btn btn--lg" onClick={onContinue}>
          Continue consultation
        </button>
      </motion.div>
    </motion.div>
  );
}
