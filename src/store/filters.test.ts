import { describe, expect, it } from 'vitest';
import { filterState, useFilters } from './filters';

describe('filterState selector', () => {
  it('returns the same object for an untouched scope (no render loop)', () => {
    // A fresh object per call made useSyncExternalStore re-render forever on the
    // country screen ("Maximum update depth exceeded").
    const s = useFilters.getState();
    expect(filterState(s, 'country:uk')).toBe(filterState(s, 'country:uk'));
    expect(filterState(s, 'country:uk')).toBe(filterState(s, 'university:x'));
  });

  it('returns the patched state once a scope exists', () => {
    useFilters.getState().patch('country:uk', { q: 'data' });
    expect(filterState(useFilters.getState(), 'country:uk').q).toBe('data');
    useFilters.getState().resetAll();
  });

  it('seeds a university scope even when its country scope was never touched', () => {
    useFilters.getState().inheritFrom('university:u1', 'country:never-opened');
    const seeded = filterState(useFilters.getState(), 'university:u1');
    expect(seeded.q).toBe('');
    expect(seeded.lvl.size).toBe(0);
    useFilters.getState().resetAll();
  });
});
