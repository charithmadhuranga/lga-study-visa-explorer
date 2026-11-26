/**
 * The consultation as a presentation (SPEC FR-27): five numbered chapters in the order a
 * consultant tells the story — who we are → where you can go → which course → your
 * shortlist → what happens next. The top bar renders them; PageDown / PageUp (what a
 * presentation clicker sends) step through them.
 *
 * Detail routes (country, university, course) belong to the chapter they were reached from,
 * so the top bar keeps the right chapter lit while the consultant drills down.
 */

export interface Chapter {
  /** Two-digit number shown in the nav and the page eyebrow */
  num: string;
  path: string;
  label: string;
  /** Longer label shown when the screen is wide enough */
  long: string;
}

export const CHAPTERS: readonly Chapter[] = [
  { num: '01', path: '/services', label: 'About LGA', long: 'About LGA' },
  { num: '02', path: '/destinations', label: 'Destinations', long: 'Destinations' },
  { num: '03', path: '/finder', label: 'Courses', long: 'Find a course' },
  { num: '04', path: '/shortlist', label: 'Shortlist', long: 'Shortlist' },
  { num: '05', path: '/journey', label: 'Next steps', long: 'Next steps' },
] as const;

/** Which chapter a pathname belongs to; -1 for the welcome screen. */
export function chapterIndex(pathname: string): number {
  if (pathname === '/' || pathname === '/welcome') return -1;
  if (/^\/(c|u)\//.test(pathname)) return 1; // country & university live under Destinations
  if (pathname.startsWith('/k/')) return 2; // a course page lives under Courses
  return CHAPTERS.findIndex((chapter) => pathname.startsWith(chapter.path));
}

/** The route PageDown / PageUp moves to, or null at either end of the deck. */
export function adjacentChapter(pathname: string, step: 1 | -1): string | null {
  const current = chapterIndex(pathname);
  if (current === -1) return step === 1 ? CHAPTERS[0].path : null;
  const next = current + step;
  if (next < 0) return '/welcome';
  return CHAPTERS[next]?.path ?? null;
}
