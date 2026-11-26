/**
 * One course result row (university page, course finder): name, optional university line,
 * level/field/duration/intake pills, shortlist marker and the fee on the right.
 */

import { useNavigate } from 'react-router-dom';
import { COUNTRIES } from '../data/content';
import { duration, money, nextIntake } from '../data/format';
import type { Catalogue, Course, University } from '../data/types';
import { useSession } from '../store/session';
import { Icon } from './Icon';

export function CourseRow({
  course,
  catalogue,
  university,
}: {
  course: Course;
  catalogue: Catalogue;
  /** Shown above the pills when the list mixes institutions (course finder) */
  university?: University;
}): React.JSX.Element {
  const navigate = useNavigate();
  const shortlisted = useSession((s) => s.shortlist.includes(course.key));
  const country = COUNTRIES.find((c) => c.id === course.country)?.name;

  return (
    <button className="course-row" onClick={() => navigate(`/k/${course.key}`)}>
      <div>
        <h3>{course.name}</h3>
        {university && (
          <div className="course-row__uni">
            {university.name} · {country}
          </div>
        )}
        <div className="pills">
          <span className="pill">{catalogue.levels[course.level]}</span>
          <span className="pill">{course.field}</span>
          <span className="pill">{duration(course)}</span>
          {course.intakes.length > 0 && (
            <span className="pill">Next intake {nextIntake(course)}</span>
          )}
          {course.tags.scholarship && <span className="pill pill--gold">Scholarships</span>}
          {shortlisted && (
            <span className="pill pill--gold">
              <Icon name="check" /> Shortlisted
            </span>
          )}
        </div>
      </div>
      <div className="course-row__fee">
        <b>{money(course.country, course.tuitionPerYear)}</b>
        <span>{course.tuitionPerYear ? 'per year' : 'tuition'}</span>
      </div>
      <span className="course-row__go">
        <Icon name="arrow-right" />
      </span>
    </button>
  );
}
