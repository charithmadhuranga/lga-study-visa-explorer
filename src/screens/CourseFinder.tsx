/**
 * Course finder (FR-06): global search across all five destinations with a US$ budget.
 * Flat course rows (reference `renderFinder`), paged at `show + 6` and growing by 24.
 */

import { useDeferredValue, useMemo, useRef } from 'react';
import { CourseRow } from '../components/CourseRow';
import { EmptyState } from '../components/EmptyState';
import { FilterRail, type ChipGroup } from '../components/FilterRail';
import { Pager } from '../components/Pager';
import { PageHeader } from '../components/PageHeader';
import { SourceNote } from '../components/SourceNote';
import { COUNTRIES } from '../data/content';
import {
  SCOPE_FINDER,
  budgetConfig,
  fieldOptions,
  levelOptions,
  monthOptions,
} from '../data/filters';
import { fmt, isoDate } from '../data/format';
import { filterCourses, matchContext } from '../data/selectors';
import { useCatalogue } from '../store/catalogue';
import { useFilters, filterState } from '../store/filters';
import { useMountAnimation } from '../animation/useMountAnimation';

export function CourseFinder(): React.JSX.Element {
  const root = useRef<HTMLElement>(null);
  const index = useCatalogue((s) => s.index);
  const scope = SCOPE_FINDER;
  const state = useFilters((s) => filterState(s, scope));
  const patch = useFilters((s) => s.patch);

  const today = isoDate(new Date());
  // The search box (FilterRail) shows every keystroke at once; the 4,225-course filter runs
  // on a deferred copy so typing never waits for the result list to re-render.
  const results = useDeferredValue(state);
  const courses = useMemo(() => {
    if (!index) return [];
    return filterCourses(
      index.catalogue.courses,
      index.universitiesById,
      results,
      matchContext(index, true, today),
      {
        queryIncludesUniversity: true,
      },
    );
  }, [index, results, today]);

  const institutions = useMemo(() => new Set(courses.map((c) => c.universityId)).size, [courses]);

  const limit = results.show + 6;
  const shown = courses.slice(0, limit);

  // Rows arrive once with the page; filtering never re-animates them (DESIGN §7.3).
  useMountAnimation(
    root,
    ({ reveal }) => {
      // One block, not 30 staggered rows: cheap to composite even without a GPU.
      reveal('#results', { y: 12, opacity: 0, duration: 0.35 });
    },
    [],
  );

  // Options span all 4,225 courses: build them once per catalogue/day, not per keystroke.
  const { groups, budget } = useMemo(() => {
    if (!index) return { groups: [] as ChipGroup[], budget: null };
    const all = index.catalogue.courses;
    const chipGroups: ChipGroup[] = [
      {
        title: 'Destination',
        key: 'co',
        options: COUNTRIES.map((c) => ({
          value: c.id,
          label: c.name,
          count: index.coursesByCountry.get(c.id)?.length ?? 0,
        })),
      },
      { title: 'Study level', key: 'lvl', options: levelOptions(all, index.catalogue) },
      { title: 'Field of study', key: 'fld', options: fieldOptions(all) },
      { title: 'Upcoming intake', key: 'mon', options: monthOptions(all, today) },
    ];
    return { groups: chipGroups, budget: budgetConfig(all, index.catalogue, 'US$', true) };
  }, [index, today]);

  return (
    <section ref={root}>
      <PageHeader
        eyebrow="03 · Find a course"
        title="Find the right course"
        lead={`Search ${fmt(index?.catalogue.counts.courses ?? 0)} courses across all five destinations, then narrow down by level, field, intake and budget.`}
      />

      <div className="split">
        <FilterRail scope={scope} groups={groups} budget={budget} extras />
        <section id="results" aria-label="Results">
          <div className="results-head">
            <h2>
              {fmt(courses.length)} course{courses.length === 1 ? '' : 's'}{' '}
              <span>· at {fmt(institutions)} institutions</span>
            </h2>
            {state.max ? (
              <span className="muted small">Budget compared in US$ equivalent</span>
            ) : null}
          </div>

          {index && courses.length ? (
            <>
              {shown.map((course) => (
                <CourseRow
                  key={course.key}
                  course={course}
                  catalogue={index.catalogue}
                  university={index.universitiesById.get(course.universityId)}
                />
              ))}
              <Pager
                shown={Math.min(limit, courses.length)}
                total={courses.length}
                onMore={() => patch(scope, { show: state.show + 24 })}
              />
            </>
          ) : (
            <EmptyState
              icon="search"
              title="No courses match"
              hint="Try a different field, intake or budget."
            />
          )}
        </section>
      </div>

      <SourceNote>
        Fees and intakes come from LGA’s course catalogue (updated {index?.catalogue.built}); US$
        figures use {index?.catalogue.fxDate} rates. LGA confirms entry and English requirements for
        your profile before you apply.
      </SourceNote>
    </section>
  );
}
