/**
 * App self-update (FR-24, SPEC §8.2). A signed feed is checked 10 s after launch, every 24 h
 * and on demand. A newer version only ever *offers* itself (banner + popover); the download,
 * install and relaunch happen after an explicit click — never in the middle of a consultation.
 * Signature verification is done by the updater plugin against the pinned public key.
 */

import { create } from 'zustand';
import { isTauri } from '../data/catalogue';

export type AppUpdateState =
  | 'unsupported' // browser dev server
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'restarting'
  | 'error';

export const FIRST_CHECK_MS = 10_000;
export const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;

/** The subset of the plugin's `Update` object we use (keeps tests free of the plugin). */
export interface PendingUpdate {
  version: string;
  body?: string;
  downloadAndInstall: (onEvent?: (event: DownloadEvent) => void) => Promise<void>;
}

export type DownloadEvent =
  | { event: 'Started'; data: { contentLength?: number } }
  | { event: 'Progress'; data: { chunkLength: number } }
  | { event: 'Finished' };

interface AppUpdateStore {
  state: AppUpdateState;
  version: string | null;
  notes: string | null;
  progress: number | null;
  error: string | null;
  /** Version whose banner the consultant dismissed with "Later" */
  dismissed: string | null;
  /** The last check was asked for by a person (show "latest version" feedback) */
  manual: boolean;
  init: () => void;
  check: (manual?: boolean) => Promise<void>;
  install: () => Promise<void>;
  dismiss: () => void;
}

let pending: PendingUpdate | null = null;
let timers: ReturnType<typeof setTimeout>[] = [];

/** Injection points so tests never touch the real plugins. */
export const updaterBackend = {
  check: async (): Promise<PendingUpdate | null> => {
    const { check } = await import('@tauri-apps/plugin-updater');
    return (await check()) as PendingUpdate | null;
  },
  relaunch: async (): Promise<void> => {
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
  },
};

export const useAppUpdate = create<AppUpdateStore>((set, get) => ({
  state: 'idle',
  version: null,
  notes: null,
  progress: null,
  error: null,
  dismissed: null,
  manual: false,

  init: () => {
    if (!isTauri()) {
      set({ state: 'unsupported' });
      return;
    }
    if (timers.length) return;
    timers = [
      setTimeout(() => void get().check(), FIRST_CHECK_MS),
      setInterval(() => void get().check(), CHECK_EVERY_MS),
    ];
  },

  check: async (manual = false) => {
    const { state } = get();
    if (state === 'unsupported' || state === 'checking' || state === 'downloading') return;
    if (state === 'restarting') return;
    set({ state: 'checking', error: null, manual });
    try {
      const update = await updaterBackend.check();
      pending = update;
      if (update) {
        set({ state: 'available', version: update.version, notes: update.body ?? null });
      } else {
        set({ state: 'up-to-date', version: null, notes: null });
      }
    } catch (err) {
      // No release yet, offline, or a bad signature/feed: never disruptive, shown in the popover.
      console.warn('App update check failed', err);
      set({ state: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  },

  install: async () => {
    if (!pending || get().state !== 'available') return;
    let total = 0;
    let received = 0;
    set({ state: 'downloading', progress: 0, error: null });
    try {
      await pending.downloadAndInstall((e) => {
        if (e.event === 'Started') total = e.data.contentLength ?? 0;
        if (e.event === 'Progress') {
          received += e.data.chunkLength;
          set({ progress: total ? Math.min(1, received / total) : null });
        }
      });
      set({ state: 'restarting', progress: 1 });
      await updaterBackend.relaunch();
    } catch (err) {
      console.error('App update failed', err);
      set({
        state: 'available',
        progress: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  dismiss: () => set({ dismissed: get().version }),
}));

/** Test hook. */
export function resetAppUpdateForTests(): void {
  timers.forEach((t) => clearTimeout(t));
  timers = [];
  pending = null;
  useAppUpdate.setState({
    state: 'idle',
    version: null,
    notes: null,
    progress: null,
    error: null,
    dismissed: null,
    manual: false,
  });
}
