/** Status popover (FR-20/21/25): provenance from the bundle, appearance choice, Esc closes. */

import { fireEvent, render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { StatusPopover } from '../src/components/StatusPopover';
import { buildIndex } from '../src/data/selectors';
import type { Catalogue } from '../src/data/types';
import { useCatalogue } from '../src/store/catalogue';
import { useAppearance } from '../src/store/appearance';
import { resetUpdatesForTests, useUpdates } from '../src/store/updates';

const catalogue = {
  schemaVersion: 2,
  built: '2026-11-26',
  sourceGeneratedAt: '2026-11-22T15:11:57+00:00',
  fxDate: '2026-11',
  fx: { USD: 1 },
  levels: ["Bachelor's", "Master's", 'MBA'],
  fields: [],
  counts: { universities: 12, courses: 3456, byCountry: {} },
  universities: [],
  courses: [],
} as unknown as Catalogue;

describe('StatusPopover', () => {
  beforeEach(() => {
    resetUpdatesForTests();
    useCatalogue.setState({ index: buildIndex(catalogue), active: null, error: null });
  });

  it('shows the chip from the store and bundle provenance in the popover', async () => {
    useUpdates.setState({
      status: {
        state: 'offline',
        progress: null,
        message: 'x',
        lastChecked: null,
        retryInSecs: 300,
      },
    });
    render(<StatusPopover />);

    const chip = screen.getByRole('button', {
      name: /course catalogue: offline · showing 26 nov 2026/i,
    });
    fireEvent.click(chip);

    const pop = screen.getByRole('dialog', { name: /course catalogue status/i });
    expect(pop).toHaveTextContent('3,456 courses · 12 institutions');
    expect(pop).toHaveTextContent('22 Nov 2026'); // source generatedAt
    expect(pop).toHaveTextContent('Next try in 5 min');
    // browser build: no updater, said plainly instead of a dead button
    expect(pop).toHaveTextContent('Automatic updates run in the desktop app');

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitForElementToBeRemoved(pop); // after the exit animation
  });

  it('offers the full Auto / Light / Dark appearance choice (FR-25)', () => {
    render(<StatusPopover />);
    fireEvent.click(screen.getByRole('button', { name: /course catalogue/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Auto' }));
    expect(useAppearance.getState().mode).toBe('auto');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Light' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
