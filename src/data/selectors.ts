/**
 * Derived views over the catalogue. All pure and memoisation-friendly: build the index once
 * per bundle (`useMemo` in the store) and let screens select from it (NFR-03).
 */

import {
  matchesCourse,
  matchesQuery,
  type FilterState,
  type MatchContext,
  type SortKey,
} from './filters';
import type { Catalogue, CountryId, Course, University } from './types';
import { FXK } from './content';

export interface CatalogueIndex {
  catalogue: Catalogue;
  coursesById: Map<string, Course>;
  universitiesById: Map<string, University>;
  coursesByCountry: Map<CountryId, Course[]>;
  universitiesByCountry: Map<CountryId, University[]>;
  coursesByUniversity: Map<string, Course[]>;
}

export function buildIndex(catalogue: Catalogue): CatalogueIndex {
  const coursesById = new Map<string, Course>();
  const universitiesById = new Map<string, University>();
  const coursesByCountry = new Map<CountryId, Course[]>();
  const universitiesByCountry = new Map<CountryId, University[]>();
  const coursesByUniversity = new Map<string, Course[]>();

  for (const university of catalogue.universities) {
    universitiesById.set(university.id, university);
    const list = universitiesByCountry.get(university.country) ?? [];
    list.push(university);
    universitiesByCountry.set(university.country, list);
  }

  for (const course of catalogue.courses) {
    coursesById.set(course.key, course);
    const byCountry = coursesByCountry.get(course.country) ?? [];
    byCountry.push(course);
    coursesByCountry.set(course.country, byCountry);

    const byUniversity = coursesByUniversity.get(course.universityId) ?? [];
    byUniversity.push(course);
    coursesByUniversity.set(course.universityId, byUniversity);
  }

  return {
    catalogue,
    coursesById,
    universitiesById,
    coursesByCountry,
    universitiesByCountry,
    coursesByUniversity,
  };
}

export function matchContext(
  index: CatalogueIndex,
  usdBudget: boolean,
  today: string,
): MatchContext {
  return { catalogue: index.catalogue, universitiesById: index.universitiesById, usdBudget, today };
}

/** Filter + text-match + sort a candidate list. */
export function filterCourses(
  courses: Course[],
  universitiesById: Map<string, University>,
  state: FilterState,
  ctx: MatchContext,
  options: { queryIncludesUniversity: boolean },
): Course[] {
  const query = state.q.trim().toLowerCase();
  const result: Course[] = [];

  for (const course of courses) {
    if (!matchesCourse(course, state, ctx)) continue;
    const university = universitiesById.get(course.universityId);
    if (!university) continue;
    if (query && !matchesQuery(course, university, query, options.queryIncludesUniversity))
      continue;
    result.push(course);
  }

  return sortCourses(result, universitiesById, state.sort);
}

export function sortCourses(
  courses: Course[],
  universitiesById: Map<string, University>,
  sort: SortKey,
): Course[] {
  const rows = [...courses];
  switch (sort) {
    case 'many':
      // Handled at institution level by institutionResults(); keep name order here.
      return rows.sort((a, b) => a.name.localeCompare(b.name));
    case 'fee':
      return rows.sort((a, b) => (a.tuitionPerYear || Infinity) - (b.tuitionPerYear || Infinity));
    case 'az':
      return rows.sort((a, b) => a.name.localeCompare(b.name));
    case 'feat':
    default:
      return rows.sort((a, b) => {
        const ua = universitiesById.get(a.universityId);
        const ub = universitiesById.get(b.universityId);
        return (ub?.featured ? 1 : 0) - (ua?.featured ? 1 : 0) || a.name.localeCompare(b.name);
      });
  }
}

export interface InstitutionRow {
  university: University;
  /** Courses that survived the filters, used for the card's level pills and counts */
  courses: Course[];
}

/**
 * Institution cards on a country page: only universities with at least one matching course,
 * ordered by the chosen sort (reference `renderUnis`).
 */
export function institutionResults(
  index: CatalogueIndex,
  country: CountryId,
  state: FilterState,
  ctx: MatchContext,
): { rows: InstitutionRow[]; total: number } {
  const query = state.q.trim().toLowerCase();
  const rows: InstitutionRow[] = [];
  let total = 0;

  for (const university of index.universitiesByCountry.get(country) ?? []) {
    const institutionMatchesQuery =
      !query ||
      `${university.name} ${university.city} ${university.province}`.toLowerCase().includes(query);

    const matching: Course[] = [];
    for (const course of index.coursesByUniversity.get(university.id) ?? []) {
      if (!matchesCourse(course, state, ctx)) continue;
      if (institutionMatchesQuery || course.name.toLowerCase().includes(query)) {
        matching.push(course);
      }
    }
    if (matching.length) {
      rows.push({ university, courses: matching });
      total += matching.length;
    }
  }

  rows.sort((a, b) => sortInstitutions(a, b, state.sort));
  return { rows, total };
}

function sortInstitutions(a: InstitutionRow, b: InstitutionRow, sort: SortKey): number {
  switch (sort) {
    case 'many':
      return (
        b.courses.length - a.courses.length || a.university.name.localeCompare(b.university.name)
      );
    case 'fee':
      return lowestFee(a) - lowestFee(b) || a.university.name.localeCompare(b.university.name);
    case 'az':
      return a.university.name.localeCompare(b.university.name);
    case 'feat':
    default:
      return (
        (b.university.featured ? 1 : 0) - (a.university.featured ? 1 : 0) ||
        b.courses.length - a.courses.length ||
        a.university.name.localeCompare(b.university.name)
      );
  }
}

function lowestFee(row: InstitutionRow): number {
  const fees = row.courses.map((c) => c.tuitionPerYear).filter(Boolean);
  return fees.length ? Math.min(...fees) : Infinity;
}

/** Institution cards on the finder: matching courses grouped by institution across countries. */
export function finderInstitutionResults(
  index: CatalogueIndex,
  state: FilterState,
  ctx: MatchContext,
): { rows: InstitutionRow[]; total: number; institutions: number } {
  const courses = filterCourses(index.catalogue.courses, index.universitiesById, state, ctx, {
    queryIncludesUniversity: true,
  });
  const grouped = new Map<string, Course[]>();
  for (const course of courses) {
    const list = grouped.get(course.universityId) ?? [];
    list.push(course);
    grouped.set(course.universityId, list);
  }
  const rows = [...grouped]
    .map(([id, list]) => ({ university: index.universitiesById.get(id)!, courses: list }))
    .filter((row) => row.university)
    .sort((a, b) => sortInstitutions(a, b, state.sort));
  return { rows, total: courses.length, institutions: rows.length };
}

/** Sibling courses for the ← / → stepper on a course page (level, then name). */
export function siblings(index: CatalogueIndex, course: Course): Course[] {
  return [...(index.coursesByUniversity.get(course.universityId) ?? [])].sort(
    (a, b) => a.level - b.level || a.name.localeCompare(b.name),
  );
}

/** Levels present in a course list, in bundle order — used for the university card's pills. */
export function levelsPresent(courses: Course[], catalogue: Catalogue): number[] {
  const present = new Set<number>(courses.map((c) => c.level));
  return catalogue.levels.map((_, index) => index).filter((index) => present.has(index));
}

/** Lowest fee across a university's courses, or 0 for "on request". */
export function lowestTuition(courses: Course[]): number {
  const fees = courses.map((c) => c.tuitionPerYear).filter(Boolean);
  return fees.length ? Math.min(...fees) : 0;
}

/** One destination at a glance — the Destinations cards and the country comparison (FR-28). */
export interface CountrySummary {
  institutions: number;
  courses: number;
  /** Lowest listed tuition per year, local currency (0 = none listed) */
  tuitionFrom: number;
  /** Median listed tuition per year, local currency (0 = none listed) */
  medianTuition: number;
  /** The median converted to US$ with the bundle's FX rates, for a like-for-like comparison */
  medianTuitionUsd: number;
}

export function countrySummary(index: CatalogueIndex, country: CountryId): CountrySummary {
  const courses = index.coursesByCountry.get(country) ?? [];
  const fees = courses
    .map((c) => c.tuitionPerYear)
    .filter((fee) => fee > 0)
    .sort((a, b) => a - b);
  const mid = Math.floor(fees.length / 2);
  const median = !fees.length
    ? 0
    : fees.length % 2
      ? fees[mid]
      : Math.round((fees[mid - 1] + fees[mid]) / 2);
  const rate = index.catalogue.fx[FXK[country]] ?? 1;
  return {
    institutions: index.universitiesByCountry.get(country)?.length ?? 0,
    // Bundle meta is authoritative for counts (same source as the welcome stats).
    courses: index.catalogue.counts.byCountry[country] ?? courses.length,
    tuitionFrom: fees[0] ?? 0,
    medianTuition: median,
    medianTuitionUsd: Math.round(median * rate),
  };
}
