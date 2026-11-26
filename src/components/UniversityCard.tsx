/**
 * Institution card (country page): campus photo (or patterned navy band), overlapping logo
 * plate, location, level pills, matching-course count and lowest tuition.
 */

import { useNavigate } from 'react-router-dom';
import { money } from '../data/format';
import type { Catalogue, Course, University } from '../data/types';
import { LogoBadge } from './LogoBadge';
import { photoUrl } from '../data/photos';

export function UniversityCard({
  university,
  courses,
  catalogue,
}: {
  university: University;
  courses: Course[];
  catalogue: Catalogue;
}): React.JSX.Element {
  const navigate = useNavigate();
  const levels = [...new Set(courses.map((c) => c.level))].sort();
  const fees = courses.map((c) => c.tuitionPerYear).filter(Boolean);
  const from = fees.length ? Math.min(...fees) : 0;
  const photo = photoUrl(university.photo);

  return (
    <button className="card uni-card" onClick={() => navigate(`/u/${university.id}`)}>
      <div className={photo ? 'uni-card__media' : 'uni-card__media uni-card__media--plain'}>
        {photo && <img src={photo} alt="" loading="lazy" />}
      </div>
      <div className="card__body">
        <LogoBadge name={university.name} src={university.logoUrl} />
        <h3>{university.name}</h3>
        <span className="uni-card__loc">
          {[university.city, university.province].filter(Boolean).join(', ')}
          {university.type || university.category
            ? ` · ${university.type || university.category}`
            : ''}
        </span>
        <div className="pills">
          {levels.map((level) => (
            <span key={level} className="pill">
              {catalogue.levels[level]}
            </span>
          ))}
          <span className="pill pill--gold">
            {courses.length} course{courses.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="uni-card__foot">
          {from ? (
            <>
              <span>Tuition from</span>
              <span>
                <b>{money(university.country, from)}</b> / year
              </span>
            </>
          ) : (
            <span>Tuition on request</span>
          )}
        </div>
      </div>
    </button>
  );
}
