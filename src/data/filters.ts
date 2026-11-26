/**
 * Filter engine — a faithful port of `match()` / `opt` / `budgetCfg` in reference/index.html.
 *
 * Scopes keep filter state independent per screen (FR-10): a country page, a university page
 * and the global finder never share selections, but a university page is seeded once from its
 * country page, exactly like the reference `vUni` does.
 */

import { usd } from './format';
import type { Catalogue, Course, LevelIndex, University } from './types';

export type SortKey = 'feat' | 'many' | 'fee' | 'az';

export const SCOPE_FINDER = 'finder';
export type Scope = string; // `country:<id>` | `university:<id>` | SCOPE_FINDER

export interface FilterState {
  q: string;
  prov: Set<string>;
  lvl: Set<string>;
  fld: Set<string>;
  co: Set<string>;
  mon: Set<string>;
  /** Max tuition per year, in the scope's currency (US$ for the finder). 0 = any budget */
  max: number;
  sch: boolean;
  coop: boolean;
  sort: SortKey;
  show: number;
  /** The reference caps region chips at 10 until "Show all" is pressed */
  provAll: boolean;
}

export function createFilterState(): FilterState {
  return {
    q: '',
    prov: new Set(),
    lvl: new Set(),
    fld: new Set(),
    co: new Set(),
    mon: new Set(),
    max: 0,
    sch: false,
    coop: false,
    sort: 'feat',
    show: 24,
    provAll: false,
  };
}

export const countryScope = (id: string): Scope => `country:${id}`;
export const universityScope = (id: string): Scope => `university:${id}`;

export const SORT_OPTIONS: [SortKey, string][] = [
  ['feat', 'Featured first'],
  ['many', 'Most matching courses'],
  ['fee', 'Lowest tuition'],
  ['az', 'A – Z'],
];

export interface MatchContext {
  catalogue: Catalogue;
  universitiesById: Map<string, University>;
  /** The scope's currency mode: budget compared in US$ only for the finder (FR-06) */
  usdBudget: boolean;
  /** Render-time intake freshness (FR-23) */
  today: string;
}

export function matchesCourse(course: Course, state: FilterState, ctx: MatchContext): boolean {
  if (state.lvl.size && !state.lvl.has(String(course.level))) return false;
  if (state.fld.size && !state.fld.has(course.field)) return false;
  if (state.co.size && !state.co.has(course.country)) return false;

  const university = ctx.universitiesById.get(course.universityId);
  if (state.prov.size && !(university && state.prov.has(university.province))) return false;

  if (state.mon.size) {
    const upcoming = course.intakes.some((i) => i.start >= ctx.today);
    if (!upcoming) return false;
    const months = new Set(
      course.intakes.filter((i) => i.start >= ctx.today).map((i) => i.start.slice(0, 7)),
    );
    if (![...state.mon].some((m) => months.has(m))) return false;
  }

  if (state.max) {
    if (!course.tuitionPerYear) return false;
    const fee = ctx.usdBudget
      ? usd(ctx.catalogue, course.country, course.tuitionPerYear)
      : course.tuitionPerYear;
    if (fee > state.max) return false;
  }

  if (state.sch && !course.tags.scholarship) return false;
  if (state.coop && !course.tags.coop) return false;
  return true;
}

/** Text match covers course name, and (when the row shows a university) institution + city. */
export function matchesQuery(
  course: Course,
  university: University,
  query: string,
  includeUniversity: boolean,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (course.name.toLowerCase().includes(q)) return true;
  if (!includeUniversity) return false;
  return `${university.name} ${course.city}`.toLowerCase().includes(q);
}

export interface ChipOption {
  value: string;
  label: string;
  count: number;
}

export function levelOptions(courses: Course[], catalogue: Catalogue): ChipOption[] {
  return catalogue.levels
    .map((label, index) => ({
      value: String(index),
      label,
      count: courses.filter((c) => c.level === (index as LevelIndex)).length,
    }))
    .filter((o) => o.count > 0);
}

export function fieldOptions(courses: Course[]): ChipOption[] {
  const counts = new Map<string, number>();
  for (const course of courses) counts.set(course.field, (counts.get(course.field) ?? 0) + 1);
  return [...counts]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, count]) => ({ value, label: value, count }));
}

export function monthOptions(courses: Course[], today: string): ChipOption[] {
  const counts = new Map<string, number>();
  for (const course of courses) {
    const seen = new Set<string>();
    for (const intake of course.intakes) {
      if (intake.start < today) continue;
      const month = intake.start.slice(0, 7);
      if (seen.has(month)) continue;
      seen.add(month);
      counts.set(month, (counts.get(month) ?? 0) + 1);
    }
  }
  return [...counts]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 12)
    .map(([value, count]) => ({
      value,
      label: `${MONTH_NAMES[Number(value.slice(5, 7)) - 1]} ${value.slice(0, 4)}`,
      count,
    }));
}

export function provinceOptions(universities: University[]): ChipOption[] {
  const counts = new Map<string, number>();
  for (const university of universities) {
    if (!university.province) continue;
    counts.set(university.province, (counts.get(university.province) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, label: value, count }));
}

export interface BudgetConfig {
  /** Currency symbol shown next to the value */
  currency: string;
  max: number;
  step: number;
}

/**
 * Slider ceiling derived from the data (reference `budgetCfg`): the highest matching fee,
 * rounded up to the step. Step is 2,000 above 60,000, otherwise 1,000.
 */
export function budgetConfig(
  courses: Course[],
  catalogue: Catalogue,
  currency: string,
  usdBudget: boolean,
): BudgetConfig | null {
  const fees = courses
    .map((c) =>
      c.tuitionPerYear
        ? usdBudget
          ? usd(catalogue, c.country, c.tuitionPerYear)
          : c.tuitionPerYear
        : 0,
    )
    .filter(Boolean);
  if (!fees.length) return null;
  const highest = Math.max(...fees);
  const step = highest > 60000 ? 2000 : 1000;
  return { currency, max: Math.ceil(highest / step) * step, step };
}

const MONTH_NAMES = [
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
];

export function clearAll(state: FilterState): FilterState {
  return {
    ...createFilterState(),
    sort: state.sort,
  };
}
