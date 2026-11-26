/**
 * Appearance: auto | light | dark, default dark (FR-25 / SPEC §12 D1).
 *
 * Persisted through `tauri-plugin-store` when running in the app, `localStorage` in the
 * browser dev server — the same key so `index.html`'s pre-paint script finds it either way.
 * Switching swaps one attribute on <html>; it never reloads or clears session state.
 */

import { create } from 'zustand';

export type ThemeMode = 'auto' | 'light' | 'dark';

const KEY = 'appearance';
const DEFAULT: ThemeMode = 'dark';

interface AppearanceStore {
  mode: ThemeMode;
  ready: boolean;
  init: () => Promise<void>;
  setMode: (mode: ThemeMode) => void;
}

function readLocal(): ThemeMode {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'auto' || value === 'light' || value === 'dark' ? value : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function apply(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
}

async function write(mode: ThemeMode): Promise<void> {
  try {
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      const { load } = await import('@tauri-apps/plugin-store');
      const store = await load('appearance.json', { autoSave: false });
      await store.set(KEY, mode);
      return;
    }
  } catch {
    // fall through to localStorage
  }
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* private mode: the setting simply does not persist */
  }
}

async function read(): Promise<ThemeMode> {
  try {
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      const { load } = await import('@tauri-apps/plugin-store');
      const store = await load('appearance.json', { autoSave: false });
      const value = await store.get<ThemeMode>(KEY);
      if (value === 'auto' || value === 'light' || value === 'dark') return value;
    }
  } catch {
    /* first run or no plugin: fall back */
  }
  return readLocal();
}

export const useAppearance = create<AppearanceStore>((set) => ({
  mode: DEFAULT,
  ready: false,

  init: async () => {
    const mode = await read();
    apply(mode);
    set({ mode, ready: true });
  },

  setMode: (mode) => {
    apply(mode);
    set({ mode });
    void write(mode);
  },
}));
