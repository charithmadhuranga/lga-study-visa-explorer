/**
 * Per-scope filter state (FR-10). Three independent scopes — country, university, finder —
 * never share selections. A university scope is seeded once from its country scope on first
 * open (reference `vUni` behaviour), implemented as an explicit `inheritFrom` call rather
 * than live binding so a consultant's later edits on the country page do not silently
 * rewrite the university page.
 */

import { create } from 'zustand';
import { createFilterState, SCOPE_FINDER, type FilterState } from '../data/filters';

export interface FilterStore {
  scopes: Record<string, FilterState>;
  /** First visit only: copy the country scope into a fresh university scope */
  inheritFrom: (scope: string, parentScope: string) => void;
  patch: (scope: string, next: Partial<FilterState>) => void;
  clear: (scope: string) => void;
  resetAll: () => void;
}

export const useFilters = create<FilterStore>((set) => ({
  scopes: { [SCOPE_FINDER]: createFilterState() },

  inheritFrom: (scope, parentScope) =>
    set((s) =>
      s.scopes[scope]
        ? s
        : {
            scopes: {
              ...s.scopes,
              // The country scope may not exist yet (filters never touched there).
              [scope]: {
                ...(s.scopes[parentScope] ?? createFilterState()),
                show: 24,
                provAll: false,
              },
            },
          },
    ),

  patch: (scope, next) =>
    set((s) => {
      const current = s.scopes[scope] ?? createFilterState();
      return { scopes: { ...s.scopes, [scope]: { ...current, ...next } } };
    }),

  clear: (scope) =>
    set((s) => {
      const current = s.scopes[scope] ?? createFilterState();
      return { scopes: { ...s.scopes, [scope]: { ...createFilterState(), sort: current.sort } } };
    }),

  resetAll: () => set({ scopes: { [SCOPE_FINDER]: createFilterState() } }),
}));

/**
 * One shared, never-mutated fallback. Zustand selectors must return a referentially stable
 * value: building a fresh default on every call made React re-render forever ("Maximum
 * update depth exceeded") on any scope that had not been patched yet.
 */
const EMPTY_STATE: FilterState = Object.freeze(createFilterState()) as FilterState;

/** Selector: state for one scope, with a stable fallback so screens render before first patch. */
export function filterState(s: FilterStore, scope: string): FilterState {
  return s.scopes[scope] ?? EMPTY_STATE;
}
