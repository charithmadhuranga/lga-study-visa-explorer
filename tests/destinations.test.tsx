/** Screen smoke test: Destinations renders bundle-derived counts (no hard-coded numbers). */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { Destinations } from '../src/screens/Destinations';
import { buildIndex } from '../src/data/selectors';
import type { Catalogue } from '../src/data/types';
import { useCatalogue } from '../src/store/catalogue';

const catalogue: Catalogue = {
  schemaVersion: 2,
  built: '2026-11-23',
  sourceGeneratedAt: '2026-11-23',
  fxDate: '2026-11',
  fx: { USD: 1, GBP: 1.3 },
  levels: ["Bachelor's", "Master's", 'MBA'],
  fields: ['Computing & IT'],
  counts: {
    universities: 436,
    courses: 4225,
    byCountry: { uk: 2, usa: 1 } as Catalogue['counts']['byCountry'],
  },
  universities: [
    {
      id: 'u1',
      name: 'Test University',
      country: 'uk',
      category: 'University',
      type: 'Public',
      founded: '1900',
      city: 'London',
      province: 'England',
      campuses: [],
      logoUrl: '',
      photo: '',
      website: '',
      students: 0,
      canWork: true,
      coop: false,
      housing: false,
      durations: [],
      about: '',
      accommodation: '',
      featured: false,
      courseCount: 2,
    },
  ],
  courses: [],
};

describe('Destinations', () => {
  beforeEach(() => {
    useCatalogue.setState({ index: buildIndex(catalogue), active: null, error: null });
  });

  it('shows the five destinations with bundle-derived institution counts', () => {
    const router = createMemoryRouter([{ path: '/destinations', element: <Destinations /> }], {
      initialEntries: ['/destinations'],
    });
    render(<RouterProvider router={router} />);

    expect(
      screen.getByRole('heading', { name: /where would you like to study/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /united kingdom/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new zealand/i })).toBeInTheDocument();
    // institution count for the UK comes from the fixture, not a constant
    expect(screen.getByText('1 institution · 2 courses')).toBeInTheDocument();
    // the US card exists even with zero fixture institutions
    expect(screen.getByText('0 institutions · 1 course')).toBeInTheDocument();
  });

  it('switches to the side-by-side comparison of all five destinations (FR-28)', () => {
    const router = createMemoryRouter([{ path: '/destinations', element: <Destinations /> }], {
      initialEntries: ['/destinations'],
    });
    render(<RouterProvider router={router} />);

    fireEvent.click(screen.getByRole('button', { name: 'Compare' }));

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(6); // label column + 5 countries
    expect(screen.getByRole('rowheader', { name: 'Work after you graduate' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Typical tuition / year' })).toBeInTheDocument();
    // counts still come from the bundle fixture, not constants
    expect(screen.getByText('1 institution')).toBeInTheDocument();
  });
});
