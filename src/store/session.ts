/**
 * Session state: shortlist, toast, idle reset (FR-07, FR-12, FR-15).
 *
 * Everything here is in-memory only (NFR-10): no disk, no localStorage, no sessionStorage.
 * The idle reset clears it, and nothing else does. This is what makes the app safe to use
 * with one customer after another on the same office screen.
 */

import { create } from 'zustand';

/** 4 minutes of silence → dialog, then a 20-second countdown to reset (reference parity). */
export const IDLE_MS = 4 * 60 * 1000;
export const IDLE_DIALOG_MS = 20 * 1000;

export type IdlePhase = 'active' | 'dialog';

export interface SessionState {
  /** Course keys the consultant has picked for the current customer */
  shortlist: string[];
  /** Transient toast message; cleared after ~2 s by the Toast component */
  toast: string | null;
  idle: IdlePhase;
  toggleShortlist: (key: string) => void;
  clearShortlist: () => void;
  isShortlisted: (key: string) => boolean;
  showToast: (message: string) => void;
  dismissToast: () => void;
  openIdleDialog: () => void;
  closeIdleDialog: () => void;
  resetSession: () => void;
}

export const useSession = create<SessionState>((set, get) => ({
  shortlist: [],
  toast: null,
  idle: 'active',

  toggleShortlist: (key) =>
    set((s) => ({
      shortlist: s.shortlist.includes(key)
        ? s.shortlist.filter((k) => k !== key)
        : [...s.shortlist, key],
      toast: s.shortlist.includes(key) ? s.toast : 'Added to shortlist',
    })),
  clearShortlist: () => set({ shortlist: [], toast: 'Shortlist cleared' }),
  isShortlisted: (key) => get().shortlist.includes(key),

  showToast: (message) => set({ toast: message }),
  dismissToast: () => set({ toast: null }),

  openIdleDialog: () => set({ idle: 'dialog' }),
  closeIdleDialog: () => set({ idle: 'active' }),

  resetSession: () => set({ shortlist: [], toast: null, idle: 'active' }),
}));
