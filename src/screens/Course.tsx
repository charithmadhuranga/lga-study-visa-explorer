/**
 * Course screen (FR-05): the page a consultant lands on when a student picks a programme.
 * Key–value facts, lazily-loaded overview from the country detail file, intakes (already
 * filtered to upcoming at render time — FR-23), work-rights panel, shortlist toggle and the
 * direction-aware sibling stepper (← / → keys, FR-13).
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { EmptyState } from '../components/EmptyState';
import { LogoBadge } from '../components/LogoBadge';
import { RichText } from '../components/RichText';
import { SourceNote } from '../components/SourceNote';
import { Icon } from '../components/Icon';
import { loadDetail } from '../data/catalogue';
import { COUNTRIES, postStudyWork } from '../data/content';
import { dayMonth, duration, fmt, isoDate, money, usd, yearMonth } from '../data/format';
import { siblings } from '../data/selectors';
import type { DetailFile } from '../data/types';
import { useCatalogue } from '../store/catalogue';
import { useSession } from '../store/session';
import { useMotionEnabled } from '../animation/useMotionEnabled';
import { useMountAnimation } from '../animation/useMountAnimation';

export function Course(): React.JSX.Element {
  const { courseKey } = useParams();
  const navigate = useNavigate();
  const root = useRef<HTMLElement>(null);
  const enabled = useMotionEnabled();

  const index = useCatalogue((s) => s.index);
  const shortlist = useSession((s) => s.shortlist);
  const toggleShortlist = useSession((s) => s.toggleShortlist);
  const showToast = useSession((s) => s.showToast);

  const [detail, setDetail] = useState<DetailFile | null>(null);

  const course = courseKey ? index?.coursesById.get(courseKey) : undefined;
  const university = course ? index?.universitiesById.get(course.universityId) : undefined;

  useEffect(() => {
    if (!course) return;
    let cancelled = false;
    void loadDetail(course.country).then((d) => {
      if (!cancelled) setDetail(d);
    });
    return () => {
      cancelled = true;
    };
  }, [course]);

  const siblingsList = course && index ? siblings(index, course) : [];
  const position = siblingsList.findIndex((s) => s.key === courseKey);
  const prev = position > 0 ? siblingsList[position - 1] : undefined;
  const next =
    position >= 0 && position < siblingsList.length - 1 ? siblingsList[position + 1] : undefined;
  const direction = useRef(1);

  // ← / → walk the sibling list (reference parity: only on a course page)
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.isContentEditable)
      )
        return;
      const forward = event.key === 'ArrowRight';
      const target2 = forward ? next : prev;
      if (target2) {
        direction.current = forward ? 1 : -1;
        navigate(`/k/${target2.key}`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, navigate]);

  useMountAnimation(
    root,
    ({ reveal }) => {
      reveal('.kv > div', { y: 12, opacity: 0, duration: 0.4, stagger: 0.05 });
    },
    [courseKey],
  );

  if (!index) return <EmptyState title="Catalogue loading…" />;
  if (!course || !university)
    return <EmptyState title="Course not found" action="Back to destinations" />;

  const catalogue = index.catalogue;
  const countryName = COUNTRIES.find((c) => c.id === course.country)?.name ?? course.country;
  const location = [course.city, course.province].filter(Boolean).join(', ') || university.city;
  const inShortlist = shortlist.includes(course.key);
  const work = postStudyWork(course.country, course.level, course.field);
  const upcoming = course.intakes.filter((i) => i.start >= isoDate(new Date()));
  const summary = detail?.courses[course.key] ?? '';
  const showUsd = course.tuitionPerYear && course.country !== 'usa';

  const applicationFee = course.applicationFee
    ? money(course.country, course.applicationFee)
    : course.tuitionPerYear
      ? 'None listed'
      : 'On request';

  const go = (target: typeof prev, step: 1 | -1): void => {
    if (!target) return;
    direction.current = step;
    navigate(`/k/${target.key}`);
  };
  const slide = enabled ? { x: direction.current * 40, opacity: 0 } : false;

  return (
    <section ref={root}>
      <Breadcrumbs
        items={[
          { label: 'Destinations', to: '/destinations' },
          { label: countryName, to: `/c/${course.country}` },
          { label: university.name, to: `/u/${university.id}` },
          { label: course.name },
        ]}
      />

      <motion.div
        key={course.key}
        initial={slide}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="course-head">
          <LogoBadge name={university.name} src={university.logoUrl} size="lg" />
          <div>
            <div className="course-head__uni">
              {university.name}{' '}
              <span>
                · {location}, {countryName}
              </span>
            </div>
            <h1>{course.name}</h1>
            <div className="pills">
              <span className="pill">{catalogue.levels[course.level]}</span>
              <span className="pill">{course.field}</span>
              {course.tags.scholarship && (
                <span className="pill pill--gold">Scholarships available</span>
              )}
              {course.tags.coop && <span className="pill pill--gold">Co-op / placement</span>}
              {course.tags.pathway && <span className="pill pill--gold">Pathway option</span>}
            </div>
          </div>
        </header>

        <div className="kv">
          <div className="kv__primary">
            <span>
              <Icon name="wallet" />
              Tuition per year
            </span>
            <b>{money(course.country, course.tuitionPerYear)}</b>
            {showUsd ? (
              <em>≈ US${fmt(usd(catalogue, course.country, course.tuitionPerYear))}</em>
            ) : null}
          </div>
          <div>
            <span>
              <Icon name="clock" />
              Duration
            </span>
            <b>{duration(course)}</b>
          </div>
          <div>
            <span>
              <Icon name="calendar" />
              Next intake
            </span>
            <b>{upcoming.length ? yearMonth(upcoming[0].start) : 'To be confirmed'}</b>
            {upcoming[0]?.deadline ? <em>Apply by {dayMonth(upcoming[0].deadline)}</em> : null}
          </div>
          <div>
            <span>
              <Icon name="passport" />
              Application fee
            </span>
            <b>{applicationFee}</b>
          </div>
        </div>

        <div className="two">
          <div className="panel">
            <h2>Course overview</h2>
            {detail === null ? (
              <p className="muted">Loading course details…</p>
            ) : summary ? (
              <div className="prose">
                <RichText html={summary} />
              </div>
            ) : (
              <p className="muted">
                Your counsellor will walk you through the full course outline.
              </p>
            )}
          </div>

          <div className="aside-sticky">
            <div className="panel">
              <motion.button
                className={
                  inShortlist ? 'btn btn--navy btn--block btn--lg' : 'btn btn--block btn--lg'
                }
                whileTap={enabled ? { scale: 0.97 } : undefined}
                onClick={() => {
                  toggleShortlist(course.key);
                  showToast(inShortlist ? 'Removed from shortlist' : 'Added to shortlist');
                }}
              >
                <Icon name={inShortlist ? 'check' : 'plus'} />
                {inShortlist ? 'In the shortlist' : 'Add to shortlist'}
              </motion.button>
              <p className="muted small">
                {inShortlist
                  ? 'Tap again to remove. Compare it in chapter 04.'
                  : 'Shortlisted courses appear side by side for comparison.'}
              </p>
            </div>

            <div className="panel panel--dark">
              <h3>Work after graduation</h3>
              <p className="panel__big">{work.headline}</p>
              <p className="muted small">{work.note}</p>
            </div>

            <div className="panel">
              <h3>Upcoming intakes</h3>
              {upcoming.length ? (
                upcoming.map((intake) => (
                  <div className="intake" key={intake.start}>
                    <b>{yearMonth(intake.start)}</b>
                    <span className="muted small">
                      {intake.deadline
                        ? `Apply by ${dayMonth(intake.deadline)}`
                        : `Starts ${dayMonth(intake.start)}`}
                    </span>
                  </div>
                ))
              ) : (
                <p className="muted">LGA confirms intake dates with the university.</p>
              )}
              <p className="muted small">Campus: {location}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <nav className="stepper" aria-label="Other courses at this university">
        {prev && (
          <button className="stepper__btn" onClick={() => go(prev, -1)}>
            <small>
              <Icon name="arrow-left" />
              Previous course
            </small>
            <strong>{prev.name}</strong>
          </button>
        )}
        {next && (
          <button className="stepper__btn stepper__btn--next" onClick={() => go(next, 1)}>
            <small>
              Next course
              <Icon name="arrow-right" />
            </small>
            <strong>{next.name}</strong>
          </button>
        )}
      </nav>

      <SourceNote>
        Fees and intakes come from LGA’s course catalogue (updated {catalogue.built}); US$ figures
        use {catalogue.fxDate} rates. LGA confirms entry and English requirements for your profile
        before you apply.
      </SourceNote>
    </section>
  );
}
