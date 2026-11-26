/**
 * Close the app from the top bar (FR-13/FR-14). Full screen hides the window's own close
 * button, so the app offers one — always behind a confirmation, because a stray tap on a
 * presentation screen must never end a consultation. Hidden in kiosk mode, where only
 * Ctrl/Cmd+Q exits (FR-14).
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { getShellInfo, quitApp } from '../shell/window';
import { useMotionEnabled } from '../animation/useMotionEnabled';
import { Icon } from './Icon';

export function CloseButton(): React.JSX.Element | null {
  const [kiosk, setKiosk] = useState(false);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    let live = true;
    void getShellInfo().then((info) => {
      if (live) setKiosk(info.kiosk);
    });
    return () => {
      live = false;
    };
  }, []);

  if (kiosk) return null;

  return (
    <>
      <button
        className="icon-btn icon-btn--close"
        onClick={() => setAsking(true)}
        aria-label="Close the app"
        title="Close the app (Ctrl+Q)"
      >
        <Icon name="close" />
      </button>
      <AnimatePresence>
        {asking && <ConfirmClose onCancel={() => setAsking(false)} />}
      </AnimatePresence>
    </>
  );
}

function ConfirmClose({ onCancel }: { onCancel: () => void }): React.JSX.Element {
  const enabled = useMotionEnabled();
  const keep = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    keep.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
      if (e.key === 'Tab') {
        // Two buttons: keep focus inside the dialog.
        e.preventDefault();
        (document.activeElement === keep.current ? close : keep).current?.focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      previous?.focus?.();
    };
  }, [onCancel]);

  return (
    <motion.div
      className="idle-backdrop"
      initial={enabled ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: enabled ? 0.18 : 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="idle-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-title"
        aria-describedby="close-desc"
      >
        <h2 id="close-title">Close LGA Study Visa Explorer?</h2>
        <p id="close-desc">
          The app will close and this consultation&rsquo;s shortlist will be cleared.
        </p>
        <div className="confirm-actions">
          <button ref={keep} className="btn btn--lg" onClick={onCancel}>
            Keep presenting
          </button>
          <button ref={close} className="btn btn--lg btn--ghost" onClick={() => void quitApp()}>
            <Icon name="close" />
            Close the app
          </button>
        </div>
      </div>
    </motion.div>
  );
}
