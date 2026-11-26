/**
 * Country (FR-03 + FR-10): cinematic band with the four key facts, then three tabs —
 * `unis` = filter rail + institution grid; `why` = numbered reasons + cities; `visa` =
 * numbered visa steps, expandable FAQ and the work-rights panels. The active tab is
 * remembered per country for the session (reference `tab[c]` parity). Numbers come from
 * the active bundle; copy from `content.ts`.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import gsap from 'gsap';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { FilterRail, type ChipGroup } from '../components/FilterRail';
import { UniversityCard } from '../components/UniversityCard';
import { EmptyState } from '../components/EmptyState';
import { Pager } from '../components/Pager';
import { Segmented } from '../components/Segmented';
import { SourceNote } from '../components/SourceNote';
import { Icon } from '../components/Icon';
import { COUNTRIES, CUR, type CountryContent } from '../data/content';
import {
  budgetConfig,
  countryScope,
  fieldOptions,
  levelOptions,
  monthOptions,
  provinceOptions,
} from '../data/filters';
import { fmt, isoDate } from '../data/format';
import { DEST_IMAGES } from '../data/images';
import { institutionResults, matchContext, type CatalogueIndex } from '../data/selectors';
import type { CountryId } from '../data/types';
import { useCatalogue } from '../store/catalogue';
import { useFilters, filterState } from '../store/filters';
import { useMotionEnabled } from '../animation/useMotionEnabled';

type Tab = 'unis' | 'why' | 'visa';

/** Session-persistent tab choice per country (reference `tab[c]` parity). */
const openTabs = new Map<CountryId, Tab>();

export function Country(): React.JSX.Element {
  const { countryId } = useParams();
  const country = COUNTRIES.find((c) => c.id === countryId);
  const [tab, setTab] = useState<Tab>(() => openTabs.get(countryId as CountryId) ?? 'unis');
  const root = useRef<HTMLElement>(null);
  const enabled = useMotionEnabled();
  const index = useCatalogue((s) => s.index);

  useEffect(() => {
    if (countryId) openTabs.set(countryId as CountryId, tab);
  }, [countryId, tab]);

  useEffect(() => {
    if (!enabled) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('.band > img', { scale: 1.06, duration: 1.2, ease: 'power2.out' })
        .from('.band h1, .band__tagline', { y: 20, opacity: 0, duration: 0.6, stagger: 0.08 }, 0.1)
        .from('.tile', { y: 18, opacity: 0, duration: 0.5, stagger: 0.06 }, 0.3);
    }, root);
    return () => ctx.revert();
  }, [enabled, countryId]);

  if (!country || !index)
    return <EmptyState title="Destination not found" action="Back to destinations" />;

  return (
    <section ref={root}>
      <Breadcrumbs
        items={[{ label: 'Destinations', to: '/destinations' }, { label: country.name }]}
      />

      <div className="band">
        <img src={DEST_IMAGES[country.id]} alt="" />
        <div>
          <div className="eyebrow on-navy">Destination</div>
          <h1>Study in {country.name}</h1>
          <p className="band__tagline">{country.tag}</p>
        </div>
        <div className="tiles">
          {country.facts.map(([big, small]) => (
            <div className="tile" key={big}>
              <b>{big}</b>
              <span>{small}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="tabbar">
        <Segmented
          id={`country-${country.id}`}
          label={`${country.name} sections`}
          asTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'unis', label: 'Universities & courses' },
            { value: 'why', label: `Why ${country.short}` },
            { value: 'visa', label: 'Visa & work' },
          ]}
        />
      </div>

      <div role="tabpanel">
        {tab === 'unis' && <Universities country={country} index={index} />}
        {tab === 'why' && <Why country={country} />}
        {tab === 'visa' && <Visa country={country} />}
      </div>

      <SourceNote>
        Visa and work rules checked November 2026 (source: {country.src}). Your LGA counsellor
        confirms the current rules for your intake.
      </SourceNote>
    </section>
  );
}

function Universities({
  country,
  index,
}: {
  country: CountryContent;
  index: CatalogueIndex;
}): React.JSX.Element {
  const scope = countryScope(country.id);
  const state = useFilters((s) => filterState(s, scope));
  const patch = useFilters((s) => s.patch);

  const catalogue = index.catalogue;
  const unis = index.universitiesByCountry.get(country.id) ?? [];
  const courses = index.coursesByCountry.get(country.id) ?? [];
  const today = isoDate(new Date());
  const ctx = matchContext(index, false, today);

  const groups: ChipGroup[] = [
    { title: 'Region / state', key: 'prov', options: provinceOptions(unis), limit: 10 },
    { title: 'Study level', key: 'lvl', options: levelOptions(courses, catalogue) },
    { title: 'Field of study', key: 'fld', options: fieldOptions(courses) },
    { title: 'Upcoming intake', key: 'mon', options: monthOptions(courses, today) },
  ];
  const budget = budgetConfig(courses, catalogue, CUR[country.id], false);

  const { rows, total } = institutionResults(index, country.id, state, ctx);
  const shown = rows.slice(0, state.show);

  return (
    <div className="split">
      <FilterRail scope={scope} groups={groups} budget={budget} extras />
      <section aria-label="Results">
        <div className="results-head">
          <h2>
            {rows.length} institution{rows.length === 1 ? '' : 's'}{' '}
            <span>· {fmt(total)} matching courses</span>
          </h2>
          <select
            aria-label="Sort institutions"
            value={state.sort}
            onChange={(e) => patch(scope, { sort: e.target.value as typeof state.sort, show: 24 })}
          >
            <option value="feat">Featured first</option>
            <option value="many">Most matching courses</option>
            <option value="fee">Lowest tuition</option>
            <option value="az">A – Z</option>
          </select>
        </div>
        {rows.length ? (
          <>
            <div className="grid">
              {shown.map((row) => (
                <UniversityCard
                  key={row.university.id}
                  university={row.university}
                  courses={row.courses}
                  catalogue={catalogue}
                />
              ))}
            </div>
            <Pager
              shown={shown.length}
              total={rows.length}
              onMore={() => patch(scope, { show: state.show + 24 })}
            />
          </>
        ) : (
          <EmptyState
            icon="filter"
            title="No institutions match these filters"
            hint="Try removing a region, intake or budget limit."
          />
        )}
      </section>
    </div>
  );
}

function Why({ country }: { country: CountryContent }): React.JSX.Element {
  return (
    <>
      <div className="grid grid--4">
        {country.why.map(([head, body], i) => (
          <article className="card feature" key={head}>
            <span className="feature__num" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3>{head}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>
      <div className="panel section">
        <h2>Popular student cities</h2>
        <div className="pills">
          {country.cities.map((city) => (
            <span key={city} className="pill pill--lg">
              <Icon name="pin" />
              {city}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

function Visa({ country }: { country: CountryContent }): React.JSX.Element {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="two">
      <div>
        <div className="panel">
          <h2>Student visa, step by step</h2>
          <ol className="steps">
            {country.visa.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        <div className="panel">
          <h2>Common questions</h2>
          <div className="faq">
            {country.faq.map(([q, a]) => {
              const expanded = open === q;
              return (
                <div className="faq__item" key={q}>
                  <button
                    className="faq__q"
                    aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? null : q)}
                  >
                    {q}
                    <Icon name="plus" />
                  </button>
                  {expanded && <p className="faq__a">{a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="aside-sticky">
        <div className="panel panel--dark">
          <h3>Work after you graduate</h3>
          <p className="panel__big">{country.facts[0][0]}</p>
          <p className="muted">{country.facts[0][1]}</p>
        </div>
        <div className="panel">
          <h3>Work while studying</h3>
          <p className="panel__big">{country.facts[2][0]}</p>
          <p className="muted">{country.facts[2][1]}</p>
        </div>
        <div className="panel panel--gold">
          <h3>LGA handles this for you</h3>
          <p className="muted">
            Document checklist, financial evidence, statement of purpose and lodgement, reviewed by
            our visa team before submission. We prepare both applications to the highest standard;
            only the immigration authority decides the visa.
          </p>
        </div>
      </div>
    </div>
  );
}
