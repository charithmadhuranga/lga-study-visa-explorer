/**
 * Catalogue store: one load per session, hot-swapped in place when Rust emits
 * `catalogue://updated` — no navigation, no spinner, no restart (FR-19/FR-21).
 */

import { create } from 'zustand';
import { loadActiveBundle, loadCatalogue, resetCatalogueCache } from '../data/catalogue';
import { buildIndex, type CatalogueIndex } from '../data/selectors';
import type { ActiveBundle } from '../data/types';

export interface CatalogueStore {
  index: CatalogueIndex | null;
  active: ActiveBundle | null;
  error: string | null;
  load: () => Promise<void>;
  /** Called by the update listener: re-read the bundle and swap the index atomically */
  reload: () => Promise<void>;
}

export const useCatalogue = create<CatalogueStore>((set) => ({
  index: null,
  active: null,
  error: null,

  load: async () => {
    try {
      const catalogue = await loadCatalogue();
      const active = await loadActiveBundle();
      set({ index: buildIndex(catalogue), active, error: null });
    } catch (err) {
      // Offline-first (NFR-07): the screen still renders; selectors guard on index === null.
      set({ error: err instanceof Error ? err.message : 'Catalogue unavailable' });
    }
  },

  reload: async () => {
    resetCatalogueCache();
    await loadCatalogue();
    const active = await loadActiveBundle();
    const catalogue = await loadCatalogue();
    set({ index: buildIndex(catalogue), active, error: null });
  },
}));
