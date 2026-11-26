/**
 * Shortlist (FR-07): the comparison table, plain-text copy for WhatsApp/email and the
 * "start new consultation" reset. Session-scoped only — nothing here touches disk (NFR-10).
 */

import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CONTACT, COUNTRIES, postStudyWork } from '../data/content';
import { duration, fmt, money, nextIntake, usd } from '../data/format';
import { useCatalogue } from '../store/catalogue';
import { useSession } from '../store/session';
import { useFilters } from '../store/filters';
import { useMotionEnabled } from '../animation/useMotionEnabled';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';

export function Shortlist(): React.JSX.Element {
  const navigate = useNavigate();
  const enabled = useMotionEnabled();
  const index = useCatalogue((s) => s.index);
  const shortlist = useSession((s) => s.shortlist);
  const toggleShortlist = useSession((s) => s.toggleShortlist);
  const showToast = useSession((s) => s.showToast);
  const resetSession = useSession((s) => s.resetSession);
  const resetFilters = useFilters((s) => s.resetAll);

  const courses = shortlist
    .map((key) => index?.coursesById.get(key))
    .filter((course): course is NonNullable<typeof course> => !!course);

  const copySummary = async (): Promise<void> => {
    if (!index) return;
    const lines = courses.map((course) => {
      const university = index.universitiesById.get(course.universityId);
      const country = COUNTRIES.find((c) => c.id === course.country)?.name ?? course.country;
      const fee = money(course.country, course.tuitionPerYear);
      return `• ${course.name}, ${university?.name ?? ''} (${country}): ${duration(course)}, ${fee}${
        course.tuitionPerYear ? '/yr' : ''
      }`;
    });
    const text = `Your LGA shortlist\n${lines.join('\n')}\n\nLGA Visa · ${CONTACT}`;

    try {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
        await writeText(text);
      } else {
        await navigator.clipboard.writeText(text);
      }
      showToast('Summary copied, ready to paste into WhatsApp or email');
    } catch {
      showToast('Copy is not available here');
    }
  };

  const startNew = (): void => {
    resetSession();
    resetFilters();
    navigate('/');
  };

  const rows: [string, (key: (typeof courses)[number]) => React.ReactNode][] = [
    [
      'University',
      (course) => {
        const university = index?.universitiesById.get(course.universityId);
        return (
          <>
            <b>{university?.name}</b>
            <span className="muted small">{course.city || university?.city}</span>
          </>
        );
      },
    ],
    [
      'Destination',
      (course) => COUNTRIES.find((c) => c.id === course.country)?.name ?? course.country,
    ],
    ['Level', (course) => index?.catalogue.levels[course.level] ?? ''],
    ['Duration', (course) => duration(course)],
    [
      'Tuition / year',
      (course) => (
        <>
          <b>{money(course.country, course.tuitionPerYear)}</b>
          {course.tuitionPerYear && course.country !== 'usa' && index ? (
            <span className="muted small">
              ≈ US${fmt(usd(index.catalogue, course.country, course.tuitionPerYear))}
            </span>
          ) : null}
        </>
      ),
    ],
    ['Next intake', (course) => nextIntake(course)],
    [
      'Work after study',
      (course) => postStudyWork(course.country, course.level, course.field).headline,
    ],
  ];

  return (
    <section>
      <PageHeader
        eyebrow="04 · Shortlist"
        title="Your shortlist"
        lead={
          courses.length
            ? `${courses.length} course${courses.length === 1 ? '' : 's'} side by side. Copy the summary to send it on WhatsApp or email.`
            : 'Add courses from any course page and they will appear here, side by side.'
        }
        actions={
          courses.length > 0 && (
            <>
              <button className="btn btn--ghost" onClick={() => void copySummary()}>
                <Icon name="copy" />
                Copy summary
              </button>
              <button className="btn btn--navy" onClick={startNew}>
                <Icon name="refresh" />
                Start new consultation
              </button>
            </>
          )
        }
      />

      {courses.length ? (
        <motion.div
          className="compare-wrap"
          layout={enabled}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        >
          <table className="compare compare--auto">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Course</span>
                </th>
                {courses.map((course) => (
                  <th key={course.key} scope="col">
                    <div className="compare__course">
                      <h3>
                        <button onClick={() => navigate(`/k/${course.key}`)}>{course.name}</button>
                      </h3>
                      <button
                        className="link-btn"
                        onClick={() => {
                          toggleShortlist(course.key);
                          showToast('Removed from shortlist');
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, render]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {courses.map((course) => (
                    <td key={course.key}>{render(course)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      ) : (
        <div className="empty">
          <span className="icon-badge">
            <Icon name="star" />
          </span>
          <h3>No courses shortlisted yet</h3>
          <p>Open a course and tap “Add to shortlist” to compare it here.</p>
          <div className="row-gap">
            <button className="btn" onClick={() => navigate('/finder')}>
              <Icon name="search" />
              Find a course
            </button>
            <button className="btn btn--ghost" onClick={() => navigate('/destinations')}>
              Explore destinations
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
