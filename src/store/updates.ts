/**
 * Catalogue update status (FR-19/FR-20/FR-21): mirrors the Rust scheduler's state, hot-swaps
 * the catalogue when `catalogue://updated` arrives, and exposes "Check for updates".
 *
 * In the browser (`npm run dev`) there is no updater: the state stays `bundled` and the chip
 * simply shows the snapshot date.
 */

import { create } from 'zustand';
import { isTauri } from '../data/catalogue';
import { dayMonth } from '../data/format';
import { useCatalogue } from './catalogue';
import { useSession } from './session';

export type UpdateState =
  | 'bundled'
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'installing'
  | 'up-to-date'
  | 'updated'
  | 'offline'
  | 'failed';

/** Shape emitted by Rust on `catalogue://status` (src-tauri/src/catalogue/mod.rs `Status`). */
export interface UpdateStatus {
  state: UpdateState;
  progress: number | null;
  message: string | null;
  lastChecked: string | null;
  retryInSecs: number | null;
}

interface UpdatesStore {
  status: UpdateStatus;
  ready: boolean;
  init: () => Promise<void>;
  checkNow: () => Promise<void>;
}

const BROWSER_STATUS: UpdateStatus = {
  state: 'bundled',
  progress: null,
  message: null,
  lastChecked: null,
  retryInSecs: null,
};

let unlisten: (() => void) | undefined;

export const useUpdates = create<UpdatesStore>((set, get) => ({
  status: BROWSER_STATUS,
  ready: false,

  init: async () => {
    if (get().ready || !isTauri()) {
      set({ ready: true });
      return;
    }
    set({ ready: true });
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const { listen } = await import('@tauri-apps/api/event');
      set({ status: await invoke<UpdateStatus>('catalogue_status') });

      const offStatus = await listen<UpdateStatus>('catalogue://status', (e) =>
        set({ status: e.payload }),
      );
      const offUpdated = await listen('catalogue://updated', () => {
        void applyUpdate();
      });
      unlisten = () => {
        offStatus();
        offUpdated();
      };
    } catch (err) {
      console.warn('Catalogue updater unavailable; showing the bundled snapshot', err);
    }
  },

  checkNow: async () => {
    if (!isTauri()) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('catalogue_check');
    } catch (err) {
      console.warn('catalogue_check failed', err);
    }
  },
}));

/** Swap the running catalogue in place, then tell the room (FR-19 AC toast). */
async function applyUpdate(): Promise<void> {
  const swapped = await useCatalogue.getState().reload();
  if (!swapped) return;
  const index = useCatalogue.getState().index;
  if (!index) return;
  const { counts, built } = index.catalogue;
  useSession
    .getState()
    .showToast(
      `Catalogue updated · ${counts.courses.toLocaleString('en-US')} courses · ${dayMonth(built)}`,
    );
}

/** Test hook: drop listeners between tests. */
export function resetUpdatesForTests(): void {
  unlisten?.();
  unlisten = undefined;
  useUpdates.setState({ status: BROWSER_STATUS, ready: false });
}

export type ChipTone = 'ok' | 'busy' | 'warn' | 'error';

/**
 * Status-chip text (FR-20). `built` is the active bundle's build date (YYYY-MM-DD).
 * Pure so every state is unit-testable without a network.
 */
export function statusChip(
  status: UpdateStatus,
  built: string | undefined,
): { label: string; tone: ChipTone } {
  const date = built ? dayMonth(built) : '';
  switch (status.state) {
    case 'checking':
      return { label: 'Checking for updates…', tone: 'busy' };
    case 'downloading': {
      const pct = status.progress === null ? '' : ` ${Math.round(status.progress * 100)}%`;
      return { label: `Updating catalogue…${pct}`, tone: 'busy' };
    }
    case 'installing':
      return { label: 'Updating catalogue…', tone: 'busy' };
    case 'updated':
      return { label: `Updated · ${date}`, tone: 'ok' };
    case 'up-to-date':
      return { label: `Up to date · ${date}`, tone: 'ok' };
    case 'offline':
      return { label: `Offline · showing ${date}`, tone: 'warn' };
    case 'failed':
      return { label: 'Update failed — retrying', tone: 'error' };
    default:
      return { label: date ? `Catalogue · ${date}` : 'Catalogue', tone: 'ok' };
  }
}
