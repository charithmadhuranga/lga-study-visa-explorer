/** Formatting helpers (FR-23, NFR-16): money, duration, intake freshness, initials. */

import { describe, expect, it } from 'vitest';
import {
  dayMonth,
  duration,
  fmt,
  initials,
  isoDate,
  money,
  months,
  nextIntake,
  yearMonth,
} from './format';

describe('money / fmt', () => {
  it('groups with en-US separators and prefixes the country symbol', () => {
    expect(fmt(4225)).toBe('4,225');
    expect(money('usa', 21200)).toBe('US$21,200');
    expect(money('uk', 15000)).toBe('£15,000');
  });

  it('renders zero as On request', () => {
    expect(money('australia', 0)).toBe('On request');
  });
});

describe('duration', () => {
  it('collapses equal bounds and spells months/years', () => {
    expect(duration({ durationMonths: [36, 36] })).toBe('3 years');
    expect(duration({ durationMonths: [18, 24] })).toBe('18 months – 2 years');
    expect(duration({ durationMonths: [12, 12] })).toBe('1 year');
    expect(duration({ durationMonths: [0, 0] })).toBe('To be confirmed');
  });

  it('months() handles single values', () => {
    expect(months(0)).toBe('');
    expect(months(9)).toBe('9 months');
    expect(months(24)).toBe('2 years');
  });
});

describe('dates', () => {
  it('formats year-month and day-month', () => {
    expect(yearMonth('2027-02-01')).toBe('Feb 2027');
    expect(dayMonth('2027-02-01')).toBe('1 Feb 2027');
    expect(isoDate(new Date(2026, 10, 26))).toBe('2026-11-26');
  });

  it('nextIntake ignores past intakes and falls back to On request (FR-23)', () => {
    const course = { intakes: [{ start: '2026-01-01' }, { start: '2027-09-01' }] };
    expect(nextIntake(course, new Date(2026, 10, 26))).toBe('Sep 2027');
    expect(nextIntake({ intakes: [{ start: '2026-01-01' }] }, new Date(2026, 10, 26))).toBe(
      'On request',
    );
    expect(nextIntake({ intakes: [] }, new Date(2026, 10, 26))).toBe('On request');
  });
});

describe('initials', () => {
  it('builds a crest badge from the institution name', () => {
    expect(initials('University of Toronto')).toBe('UT');
    expect(initials('Academy of Interactive Technology (AIT)')).toBe('AIT');
  });
});
