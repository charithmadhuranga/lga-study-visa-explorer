/**
 * Idle detection (FR-12): any pointer or keyboard input postpones the 4-minute timer;
 * silence opens the reset dialog. Mounted once in `App`, so every screen inherits it.
 * Returns the handler the dialog calls when its 20-second countdown expires.
 */

import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IDLE_MS, useSession } from '../store/session';

const INPUT_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

export function useIdleTimer(): () => void {
  const navigate = useNavigate();
  const idle = useSession((s) => s.idle);
  const openDialog = useSession((s) => s.openIdleDialog);
  const resetSession = useSession((s) => s.resetSession);

  useEffect(() => {
    if (idle === 'dialog') return;

    let timer = window.setTimeout(openDialog, IDLE_MS);
    const poke = (): void => {
      window.clearTimeout(timer);
      timer = window.setTimeout(openDialog, IDLE_MS);
    };

    for (const event of INPUT_EVENTS) window.addEventListener(event, poke, { passive: true });
    return () => {
      window.clearTimeout(timer);
      for (const event of INPUT_EVENTS) window.removeEventListener(event, poke);
    };
  }, [idle, openDialog]);

  return useCallback(() => {
    resetSession();
    navigate('/');
  }, [resetSession, navigate]);
}
