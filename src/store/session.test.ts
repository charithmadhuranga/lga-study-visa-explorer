/** Session store tests (FR-07, FR-12): shortlist toggling and the idle reset contract. */

import { describe, expect, it } from 'vitest';
import { useSession } from './session';

describe('session store', () => {
  it('toggles shortlist entries and announces the change', () => {
    const { toggleShortlist, clearShortlist } = useSession.getState();

    toggleShortlist('a');
    expect(useSession.getState().shortlist).toEqual(['a']);
    expect(useSession.getState().toast).toBe('Added to shortlist');

    toggleShortlist('a');
    expect(useSession.getState().shortlist).toEqual([]);

    toggleShortlist('a');
    toggleShortlist('b');
    expect(useSession.getState().shortlist).toEqual(['a', 'b']);
    clearShortlist();
    expect(useSession.getState().shortlist).toEqual([]);
  });

  it('resetSession wipes the shortlist and returns to the active phase', () => {
    useSession.getState().toggleShortlist('x');
    useSession.getState().openIdleDialog();
    expect(useSession.getState().idle).toBe('dialog');

    useSession.getState().resetSession();
    expect(useSession.getState()).toMatchObject({ shortlist: [], toast: null, idle: 'active' });
  });

  it('never persists anything to storage (NFR-10)', () => {
    useSession.getState().toggleShortlist('persist-me');
    expect(window.localStorage.length).toBe(0);
  });
});
