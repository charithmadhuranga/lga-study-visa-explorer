/** Filter engine tests (FR-10, FR-06): the reference `match()` port must behave identically. */

import { describe, expect, it } from 'vitest';
import {
  budgetConfig,
  createFilterState,
  matchesCourse,
  matchesQuery,
  type MatchContext,
} from './filters';
import type { Catalogue, Course, University } from './types';

const universitiesById = new Map<string, University>([
  [
    'uni-1',
    {
      id: 'uni-1',
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
      featured: true,
      courseCount: 1,
    },
  ],
]);

const catalogue = {
  schemaVersion: 2,
  built: '2026-11-23',
  sourceGeneratedAt: '2026-11-23',
  fxDate: '2026-11',
  fx: { USD: 1, GBP: 1.3 },
  levels: ["Bachelor's", "Master's", 'MBA'],
  fields: ['Computing & IT', 'Business & Management'],
  counts: { universities: 1, courses: 1, byCountry: { uk: 1 } } as Catalogue['counts'],
  universities: [...universitiesById.values()],
  courses: [],
} satisfies Catalogue;

function course(overrides: Partial<Course> = {}): Course {
  return {
    key: 'c1',
    name: 'BSc Computing',
    universityId: 'uni-1',
    country: 'uk',
    level: 0,
    field: 'Computing & IT',
    tuitionPerYear: 20000,
    currency: 'GBP',
    applicationFee: 100,
    durationMonths: [36, 36],
    intakes: [{ start: '2027-09-01' }],
    tags: { scholarship: false, coop: false, pathway: false },
    city: 'London',
    province: 'England',
    ...overrides,
  };
}

function ctx(overrides: Partial<MatchContext> = {}): MatchContext {
  return { catalogue, universitiesById, usdBudget: false, today: '2026-11-26', ...overrides };
}

describe('matchesCourse', () => {
  it('matches everything when no filter is set', () => {
    expect(matchesCourse(course(), createFilterState(), ctx())).toBe(true);
  });

  it('filters by level and field', () => {
    const state = { ...createFilterState(), lvl: new Set(['1']) };
    expect(matchesCourse(course(), state, ctx())).toBe(false);
    expect(matchesCourse(course({ level: 1 }), state, ctx())).toBe(true);

    const byField = { ...createFilterState(), fld: new Set(['Business & Management']) };
    expect(matchesCourse(course(), byField, ctx())).toBe(false);
  });

  it('compares the budget in local currency by default and in US$ for the finder', () => {
    const state = { ...createFilterState(), max: 15000 };
    expect(matchesCourse(course(), state, ctx())).toBe(false);

    // US$ mode converts with the bundle FX table: 20000 GBP × 1.3 = 26000 US$
    const finderState = { ...createFilterState(), max: 26000 };
    expect(matchesCourse(course(), finderState, ctx({ usdBudget: true }))).toBe(true);
    expect(matchesCourse(course(), finderState, ctx({ usdBudget: false }))).toBe(true);
    expect(matchesCourse(course(), { ...finderState, max: 25000 }, ctx({ usdBudget: true }))).toBe(
      false,
    );
  });

  it('never matches a zero-fee course against a budget (on request)', () => {
    const state = { ...createFilterState(), max: 1000 };
    expect(matchesCourse(course({ tuitionPerYear: 0 }), state, ctx())).toBe(false);
  });

  it('drops courses whose intakes have all passed (FR-23)', () => {
    const state = { ...createFilterState(), mon: new Set(['2027-09']) };
    expect(matchesCourse(course(), state, ctx())).toBe(true);
    expect(matchesCourse(course({ intakes: [{ start: '2026-01-01' }] }), state, ctx())).toBe(false);
    expect(matchesCourse(course({ intakes: [] }), state, ctx())).toBe(false);
  });

  it('filters by scholarship and co-op tags', () => {
    expect(matchesCourse(course(), { ...createFilterState(), sch: true }, ctx())).toBe(false);
    expect(
      matchesCourse(
        course({ tags: { scholarship: true, coop: false, pathway: false } }),
        { ...createFilterState(), sch: true },
        ctx(),
      ),
    ).toBe(true);
    expect(matchesCourse(course(), { ...createFilterState(), coop: true }, ctx())).toBe(false);
  });

  it('filters by institution province through the university index', () => {
    const state = { ...createFilterState(), prov: new Set(['Scotland']) };
    expect(matchesCourse(course(), state, ctx())).toBe(false);
    expect(
      matchesCourse(course(), { ...createFilterState(), prov: new Set(['England']) }, ctx()),
    ).toBe(true);
  });
});

describe('matchesQuery', () => {
  const university = [...universitiesById.values()][0];

  it('matches course names always, and institution/city only when asked', () => {
    expect(matchesQuery(course(), university, 'computing', false)).toBe(true);
    expect(matchesQuery(course(), university, 'test uni', false)).toBe(false);
    expect(matchesQuery(course(), university, 'test uni', true)).toBe(true);
    expect(matchesQuery(course(), university, 'london', true)).toBe(true);
    expect(matchesQuery(course(), university, '', false)).toBe(true);
  });
});

describe('budgetConfig', () => {
  it('rounds the ceiling up to the step and switches to 2,000 above 60,000', () => {
    const low = budgetConfig([course()], catalogue, '£', false);
    expect(low).toEqual({ currency: '£', max: 20000, step: 1000 });

    const high = budgetConfig([course({ tuitionPerYear: 61500 })], catalogue, '£', false);
    expect(high).toEqual({ currency: '£', max: 62000, step: 2000 });
  });

  it('returns null when there is nothing to budget against', () => {
    expect(budgetConfig([], catalogue, '£', false)).toBeNull();
    expect(budgetConfig([course({ tuitionPerYear: 0 })], catalogue, '£', false)).toBeNull();
  });
});
