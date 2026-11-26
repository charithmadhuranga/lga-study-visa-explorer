/**
 * Formatting helpers ported from the reference `index.html` helpers section.
 * Numbers use en-US grouping (NFR-16) so a Sri Lankan consultant and a parent
 * read the same figures the mock showed them.
 */

import { CUR, FXK } from './content';
import type { Catalogue, CountryId, Course, LevelIndex } from './types';

const MN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** 12345 → "12,345" */
export function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** 21200 in Australia → "A$21,200"; 0 → "On request" */
export function money(country: CountryId, value: number): string {
  return value ? CUR[country] + fmt(value) : 'On request';
}

/** Local fee → US$ using the active bundle's FX table */
export function usd(catalogue: Catalogue, country: CountryId, value: number): number {
  if (!value) return 0;
  return value * (catalogue.fx[FXK[country]] ?? 1);
}

/** 36 → "3 years", 18 → "18 months" */
export function months(m: number): string {
  if (!m) return '';
  if (m % 12 === 0) return m / 12 === 1 ? '1 year' : `${m / 12} years`;
  return `${m} months`;
}

/** "3 years", "1 – 2 years" or "To be confirmed" */
export function duration(course: Pick<Course, 'durationMonths'>): string {
  const [min, max] = course.durationMonths;
  if (!min) return 'To be confirmed';
  if (min === max) return months(min);
  return `${months(min)} – ${months(max)}`;
}

/** "2027-02-01" → "Feb 2027" */
export function yearMonth(iso: string): string {
  const m = Number(iso.slice(5, 7)) - 1;
  const month = MN[m] ?? '';
  return `${month} ${iso.slice(0, 4)}`;
}

/** "2027-02-01" → "1 Feb 2027" */
export function dayMonth(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${yearMonth(iso)}`;
}

/** Upcoming intake already filtered to >= today by the renderer (FR-23) */
export function nextIntake(course: Pick<Course, 'intakes'>, today = new Date()): string {
  const upcoming = course.intakes.filter((i) => i.start >= isoDate(today));
  return upcoming.length ? yearMonth(upcoming[0].start) : 'On request';
}

/** Local date as YYYY-MM-DD, used for the FR-23 render-time intake filter */
export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "University of Toronto" → "UT" (crest badge fallback) */
export function initials(name: string): string {
  const letters = name
    .replace(/\(.*?\)/g, '')
    .replace(/\b(of|the|and|at|in|for)\b/gi, '')
    .split(/[\s,–-]+/)
    .filter((w) => /^[A-Z]/.test(w))
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 3);
  return letters || name[0] || '?';
}

/** Level index → display name from the bundle */
export function levelName(catalogue: Catalogue, level: LevelIndex): string {
  return catalogue.levels[level] ?? '';
}
