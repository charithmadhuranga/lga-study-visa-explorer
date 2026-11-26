import { describe, expect, it } from 'vitest';
import { buildIndex, countrySummary } from './selectors';
import type { Catalogue, Course } from './types';

const course = (key: string, fee: number): Course => ({
  key,
  name: key,
  universityId: 'u1',
  country: 'uk',
  level: 0,
  field: 'Computing & IT',
  tuitionPerYear: fee,
  currency: 'GBP',
  applicationFee: 0,
  durationMonths: [12, 12],
  intakes: [],
  tags: { scholarship: false, coop: false, pathway: false },
  city: 'London',
  province: 'England',
});

const catalogue = {
  schemaVersion: 2,
  built: '2026-11-23',
  sourceGeneratedAt: '2026-11-23',
  fxDate: '2026-11',
  fx: { USD: 1, GBP: 1.3 },
  levels: ["Bachelor's", "Master's", 'MBA'],
  fields: ['Computing & IT'],
  counts: { universities: 1, courses: 4, byCountry: { uk: 4 } },
  universities: [{ id: 'u1', country: 'uk' }],
  // 0 = "on request" and must not drag the minimum or the median down
  courses: [course('a', 10000), course('b', 0), course('c', 20000), course('d', 15000)],
} as unknown as Catalogue;

describe('countrySummary (FR-28)', () => {
  it('derives counts, lowest and median tuition from the bundle', () => {
    const summary = countrySummary(buildIndex(catalogue), 'uk');
    expect(summary).toEqual({
      institutions: 1,
      courses: 4,
      tuitionFrom: 10000,
      medianTuition: 15000,
      medianTuitionUsd: 19500,
    });
  });

  it('is all zeros for a destination with no data', () => {
    expect(countrySummary(buildIndex(catalogue), 'usa')).toEqual({
      institutions: 0,
      courses: 0,
      tuitionFrom: 0,
      medianTuition: 0,
      medianTuitionUsd: 0,
    });
  });
});
