/**
 * University screen (FR-04 + FR-10): hero, fact strip, About / At a glance / Accommodation,
 * then the course list behind a filter rail. The university scope is seeded once from its
 * country scope on first open (reference `vUni` init parity), then stays independent.
 * Long-form text loads lazily from the country detail file and degrades to the short blurb.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import gsap from 'gsap';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CourseRow } from '../components/CourseRow';
import { EmptyState } from '../components/EmptyState';
import { FilterRail, type ChipGroup } from '../components/FilterRail';
import { LogoBadge } from '../components/LogoBadge';
import { Pager } from '../components/Pager';
import { RichText } from '../components/RichText';
import { SourceNote } from '../components/SourceNote';
import { loadDetail } from '../data/catalogue';
import { COUNTRIES } from '../data/content';
import {
  budgetConfig,
  countryScope,
  fieldOptions,
  levelOptions,
  monthOptions,
  universityScope,
} from '../data/filters';
import { fmt, isoDate, money } from '../data/format';
import { filterCourses, matchContext } from '../data/selectors';
import type { DetailFile } from '../data/types';
import { photoUrl } from '../data/photos';
import { useCatalogue } from '../store/catalogue';
import { useFilters, filterState } from '../store/filters';
import { useMotionEnabled } from '../animation/useMotionEnabled';

export function University(): React.JSX.Element {
  const { universityId } = useParams();
  const root = useRef<HTMLElement>(null);
  const enabled = useMotionEnabled();
  const index = useCatalogue((s) => s.index);
  const scope = universityScope(universityId ?? '');
  const state = useFilters((s) => filterState(s, scope));
  const patch = useFilters((s) => s.patch);
  const inheritFrom = useFilters((s) => s.inheritFrom);

  const [detail, setDetail] = useState<DetailFile | null>(null);
  const [expanded, setExpanded] = useState({ about: false, acc: false });

  const university = universityId ? index?.universitiesById.get(universityId) : undefined;

  // Seed once from the country scope, exactly like the reference's one-time init.
  useEffect(() => {
    if (university) inheritFrom(scope, countryScope(university.country));
  }, [university, scope, inheritFrom]);

  useEffect(() => {
    if (!university) return;
    let cancelled = false;
    void loadDetail(university.country).then((d) => {
      if (!cancelled) setDetail(d);
    });
    return () => {
      cancelled = true;
    };
  }, [university]);

  useEffect(() => {
    if (!enabled) return;
    const ctx = gsap.context(() => {
      gsap.from('.fact', {
        y: 16,
        opacity: 0,
        duration: 0.45,
        stagger: 0.05,
        ease: 'power3.out',
      });
      gsap.from('.uni-hero .logo', { scale: 0.94, opacity: 0, duration: 0.5, ease: 'power3.out' });
    }, root);
    return () => ctx.revert();
  }, [enabled, universityId]);

  if (!index) return <EmptyState title="Catalogue loading…" />;
  if (!university) return <EmptyState title="University not found" action="Back to destinations" />;

  const catalogue = index.catalogue;
  const country = university.country;
  const countryName = COUNTRIES.find((c) => c.id === country)?.name ?? country;
  const courses = index.coursesByUniversity.get(university.id) ?? [];
  const today = isoDate(new Date());
  const ctx = matchContext(index, false, today);

  const groups: ChipGroup[] = [
    { title: 'Study level', key: 'lvl', options: levelOptions(courses, catalogue) },
    { title: 'Field of study', key: 'fld', options: fieldOptions(courses) },
    { title: 'Upcoming intake', key: 'mon', options: monthOptions(courses, today) },
  ];
  const budget = budgetConfig(courses, catalogue, '', false);

  const filtered = filterCourses(courses, index.universitiesById, state, ctx, {
    queryIncludesUniversity: false,
  });

  const fees = courses.map((c) => c.tuitionPerYear).filter(Boolean);
  const from = fees.length ? Math.min(...fees) : 0;
  const longAbout = detail?.universities[university.id]?.about ?? '';
  const accommodation =
    detail?.universities[university.id]?.accommodation ?? university.accommodation;
  const campuses = university.campuses.length ? university.campuses.join(' · ') : university.city;

  const facts: [string, string][] = [
    [
      university.type
        ? `${university.type} ${university.category.toLowerCase()}`
        : university.category,
      'Institution type',
    ],
    university.students
      ? [fmt(university.students), 'Students']
      : [university.founded || '—', 'Founded'],
    [String(courses.length), 'Courses in our catalogue'],
    [from ? money(university.country, from) : 'On request', 'Tuition from, per year'],
  ];

  const photo = photoUrl(university.photo);

  return (
    <section ref={root}>
      <Breadcrumbs
        items={[
          { label: 'Destinations', to: '/destinations' },
          { label: countryName, to: `/c/${country}` },
          { label: university.name },
        ]}
      />

      <div className={photo ? 'uni-hero' : 'uni-hero uni-hero--plain'}>
        {photo && <img src={photo} alt="" />}
        <div className="uni-hero__in">
          <LogoBadge name={university.name} src={university.logoUrl} size="lg" />
          <div>
            <div className="eyebrow on-navy">{countryName}</div>
            <h1>{university.name}</h1>
            <div className="uni-hero__loc">
              {[university.city, university.province].filter(Boolean).join(', ')}
              {university.founded && university.students ? ` · founded ${university.founded}` : ''}
            </div>
          </div>
        </div>
      </div>

      <div className="facts">
        {facts.map(([big, small]) => (
          <div className="fact" key={small}>
            <b>{big}</b>
            <span>{small}</span>
          </div>
        ))}
      </div>

      <div className="two">
        <div className="panel">
          <h2>About</h2>
          <div className={`prose ${expanded.about ? '' : 'clamp'}`}>
            {longAbout ? <RichText html={longAbout} /> : <p>{university.about}</p>}
          </div>
          {(longAbout || university.about) && (
            <button
              className="link-btn"
              onClick={() => setExpanded((e) => ({ ...e, about: !e.about }))}
            >
              {expanded.about ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
        <div>
          <div className="panel">
            <h3>At a glance</h3>
            <ul className="tick">
              {campuses && <li>Campuses: {campuses}</li>}
              {university.canWork && <li>Work while you study</li>}
              {university.coop && <li>Co-op / work placement programmes</li>}
              {university.housing && <li>On-campus housing available</li>}
              {university.durations.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
          {accommodation && (
            <div className="panel">
              <h3>Accommodation</h3>
              <div className={expanded.acc ? 'prose small' : 'prose small clamp'}>
                <RichText html={accommodation} />
              </div>
              <button
                className="link-btn"
                onClick={() => setExpanded((e) => ({ ...e, acc: !e.acc }))}
              >
                {expanded.acc ? 'Show less' : 'Read more'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="split section">
        <FilterRail
          scope={scope}
          placeholder="Search courses"
          groups={groups}
          budget={budget}
          extras={courses.some((c) => c.tags.scholarship || c.tags.coop)}
        />
        <section aria-label="Courses">
          <div className="results-head">
            <h2>
              {filtered.length} course{filtered.length === 1 ? '' : 's'}
            </h2>
            <span className="muted small">Tuition per year as listed by the institution</span>
          </div>
          {filtered.length ? (
            <>
              {filtered.slice(0, state.show).map((course) => (
                <CourseRow key={course.key} course={course} catalogue={catalogue} />
              ))}
              <Pager
                shown={Math.min(filtered.length, state.show)}
                total={filtered.length}
                onMore={() => patch(scope, { show: state.show + 24 })}
              />
            </>
          ) : (
            <EmptyState icon="filter" title="No courses match" hint="Clear a filter to see more." />
          )}
        </section>
      </div>

      <SourceNote>
        Course list, fees and intakes come from LGA’s course catalogue (updated {catalogue.built}).
        LGA confirms entry requirements for your profile before you apply.
      </SourceNote>
    </section>
  );
}
