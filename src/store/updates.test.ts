import { describe, expect, it } from 'vitest';
import { statusChip, type UpdateState, type UpdateStatus } from './updates';

const status = (state: UpdateState, extra: Partial<UpdateStatus> = {}): UpdateStatus => ({
  state,
  progress: null,
  message: null,
  lastChecked: null,
  retryInSecs: null,
  ...extra,
});

describe('catalogue status chip (FR-20)', () => {
  it('names every state, with the bundle date where it matters', () => {
    const built = '2026-11-23';
    expect(statusChip(status('bundled'), built)).toEqual({
      label: 'Catalogue · 23 Nov 2026',
      tone: 'ok',
    });
    expect(statusChip(status('checking'), built).tone).toBe('busy');
    expect(statusChip(status('downloading', { progress: 0.42 }), built).label).toBe(
      'Updating catalogue… 42%',
    );
    expect(statusChip(status('installing'), built).label).toBe('Updating catalogue…');
    expect(statusChip(status('up-to-date'), built)).toEqual({
      label: 'Up to date · 23 Nov 2026',
      tone: 'ok',
    });
    expect(statusChip(status('updated'), built).label).toBe('Updated · 23 Nov 2026');
    expect(statusChip(status('offline'), built)).toEqual({
      label: 'Offline · showing 23 Nov 2026',
      tone: 'warn',
    });
    expect(statusChip(status('failed'), built)).toEqual({
      label: 'Update failed — retrying',
      tone: 'error',
    });
  });

  it('dates come from the bundle passed in, never a constant', () => {
    expect(statusChip(status('up-to-date'), '2027-03-05').label).toBe('Up to date · 5 Mar 2027');
  });
});
