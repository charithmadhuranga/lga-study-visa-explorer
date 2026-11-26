/**
 * Catalogue schema v2 — the app-internal shape of the bundled/updated data.
 * Field-for-field mapping from the reference tuple encoding is in SPEC.md §7.1.
 */

export type CountryId = 'uk' | 'australia' | 'canada' | 'new-zealand' | 'usa';
/** 0 = Bachelor's, 1 = Master's, 2 = MBA (indexes `levels[]`) */
export type LevelIndex = 0 | 1 | 2;
export type CurrencyCode = 'USD' | 'CAD' | 'AUD' | 'GBP' | 'NZD';

export const COUNTRY_IDS: readonly CountryId[] = [
  'uk',
  'australia',
  'canada',
  'new-zealand',
  'usa',
] as const;

export interface Intake {
  /** ISO date the course starts */
  start: string;
  /** ISO application deadline, only when it differs from `start` */
  deadline?: string;
}

export interface CourseTags {
  scholarship: boolean;
  coop: boolean;
  pathway: boolean;
}

export interface University {
  id: string;
  name: string;
  country: CountryId;
  category: string;
  /** "Public" | "Private" | "" */
  type: string;
  founded: string;
  city: string;
  province: string;
  campuses: string[];
  logoUrl: string;
  /** Bundled relative image path (`img/uni/<id>.webp`) or '' when there is no local photo */
  photo: string;
  website: string;
  students: number;
  canWork: boolean;
  coop: boolean;
  housing: boolean;
  /** e.g. ["Average undergraduate program: One Year"] */
  durations: string[];
  /** Sanitised HTML — render with <RichText> only */
  about: string;
  accommodation: string;
  featured: boolean;
  courseCount: number;
}

export interface Course {
  key: string;
  name: string;
  universityId: string;
  country: CountryId;
  level: LevelIndex;
  field: string;
  /** Per year, in `currency`; 0 means "On request" */
  tuitionPerYear: number;
  currency: CurrencyCode | null;
  applicationFee: number;
  /** [minimum, maximum] in months */
  durationMonths: [number, number];
  intakes: Intake[];
  tags: CourseTags;
  city: string;
  province: string;
}

export interface BundleCounts {
  universities: number;
  courses: number;
  byCountry: Record<CountryId, number>;
}

export interface BundleMeta {
  schemaVersion: 2;
  /** Local date this bundle was produced, YYYY-MM-DD */
  built: string;
  /** `generatedAt` of the upstream courses.json this bundle was built from */
  sourceGeneratedAt: string;
  /** YYYY-MM of the FX rates below */
  fxDate: string;
  fx: Record<string, number>;
}

export interface Catalogue extends BundleMeta {
  levels: string[];
  fields: string[];
  counts: BundleCounts;
  universities: University[];
  courses: Course[];
}

/** details/<country>.json — long HTML kept out of the main catalogue file (SPEC §7.2) */
export interface DetailFile {
  country: CountryId;
  /** courseKey → sanitised summary HTML */
  courses: Record<string, string>;
  /** universityId → long-form text */
  universities: Record<string, { about: string; accommodation: string }>;
}

/** Everything the UI needs to describe where its numbers came from (FR-21). */
export interface ActiveBundle {
  /** Absolute-ish root usable with convertFileSrc(), or a dev path */
  root: string;
  meta: BundleMeta;
  counts: BundleCounts;
  /** 'bundled' | 'updates/vN' */
  source: string;
}
