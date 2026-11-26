/**
 * Destinations (FR-02, FR-28): chapter 02 of the consultation. Two views of the same five
 * countries — photo cards to choose from, and a side-by-side comparison of work rights,
 * intakes and tuition for the "which country?" conversation. Counts and fees come from the
 * active bundle; rules from `content.ts`.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { COUNTRIES } from '../data/content';
import { fmt, money } from '../data/format';
import { DEST_IMAGES } from '../data/images';
import { countrySummary, type CatalogueIndex } from '../data/selectors';
import { useCatalogue } from '../store/catalogue';
import { useMotionEnabled } from '../animation/useMotionEnabled';
import { PageHeader } from '../components/PageHeader';
import { Segmented } from '../components/Segmented';
import { SourceNote } from '../components/SourceNote';
import { Icon } from '../components/Icon';

type View = 'cards' | 'compare';

/** Remember the chosen view for the session, like the country tabs. */
let lastView: View = 'cards';

const plural = (n: number, word: string): string => `${fmt(n)} ${word}${n === 1 ? '' : 's'}`;

export function Destinations(): React.JSX.Element {
  const navigate = useNavigate();
  const root = useRef<HTMLElement>(null);
  const enabled = useMotionEnabled();
  const index = useCatalogue((s) => s.index);
  const [view, setView] = useState<View>(lastView);

  useEffect(() => {
    lastView = view;
  }, [view]);

  useEffect(() => {
    if (!enabled) return;
    const ctx = gsap.context(() => {
      gsap.from(view === 'cards' ? '.dest-card' : '.compare tr', {
        y: view === 'cards' ? 40 : 12,
        opacity: 0,
        duration: 0.6,
        stagger: view === 'cards' ? 0.07 : 0.04,
        ease: 'power3.out',
        clearProps: 'opacity,transform',
      });
    }, root);
    return () => ctx.revert();
  }, [enabled, view]);

  return (
    <section ref={root}>
      <PageHeader
        eyebrow="02 · Destinations"
        title="Where would you like to study?"
        lead="Five destinations, each with its own strengths. Choose one to see its universities, courses, visa steps and work rights."
        actions={
          <>
            <Segmented
              id="dest-view"
              label="Destinations view"
              value={view}
              onChange={setView}
              options={[
                { value: 'cards', label: 'Explore' },
                { value: 'compare', label: 'Compare' },
              ]}
            />
            <button className="btn btn--ghost" onClick={() => navigate('/finder')}>
              <Icon name="search" />
              Search all courses
            </button>
          </>
        }
      />

      {view === 'cards' ? <Cards index={index} /> : <Compare index={index} />}

      <SourceNote>
        Work and visa rules checked November 2026 against each government’s official guidance.
        Institution counts and tuition come from LGA’s course catalogue
        {index ? ` (updated ${index.catalogue.built}; US$ at ${index.catalogue.fxDate} rates)` : ''}
        .
      </SourceNote>
    </section>
  );
}

function Cards({ index }: { index: CatalogueIndex | null }): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="dest-grid">
      {COUNTRIES.map((country) => {
        const summary = index ? countrySummary(index, country.id) : null;
        return (
          <button
            key={country.id}
            className="dest-card"
            onClick={() => navigate(`/c/${country.id}`)}
            aria-label={`${country.name}: ${country.facts[0][0]} post-study work`}
          >
            <img src={DEST_IMAGES[country.id]} alt="" />
            <div className="dest-card__body">
              <h2 className="dest-card__name">{country.name}</h2>
              <ul className="dest-card__facts">
                <li>
                  <b>{country.facts[0][0]}</b>
                  <span>post-study work</span>
                </li>
                <li>
                  <b>{country.facts[1][0]}</b>
                  <span>main intakes</span>
                </li>
              </ul>
              <div className="dest-card__meta">
                {plural(summary?.institutions ?? 0, 'institution')} ·{' '}
                {plural(summary?.courses ?? 0, 'course')}
              </div>
              <span className="dest-card__go">
                Explore {country.short}
                <Icon name="arrow-right" />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Compare({ index }: { index: CatalogueIndex | null }): React.JSX.Element {
  const navigate = useNavigate();
  const summaries = COUNTRIES.map((country) => ({
    country,
    summary: index ? countrySummary(index, country.id) : null,
  }));

  const rows: [string, (item: (typeof summaries)[number]) => React.ReactNode][] = [
    [
      'Work after you graduate',
      ({ country }) => (
        <>
          <b>{country.facts[0][0]}</b>
          <span className="muted small">{country.facts[0][1]}</span>
        </>
      ),
    ],
    [
      'Main intakes',
      ({ country }) => (
        <>
          <b>{country.facts[1][0]}</b>
          <span className="muted small">{country.facts[1][1]}</span>
        </>
      ),
    ],
    [
      'Work while studying',
      ({ country }) => (
        <>
          <b>{country.facts[2][0]}</b>
          <span className="muted small">{country.facts[2][1]}</span>
        </>
      ),
    ],
    [
      'Typical tuition / year',
      ({ country, summary }) =>
        summary?.medianTuition ? (
          <>
            <b>{money(country.id, summary.medianTuition)}</b>
            <span className="muted small">
              median
              {country.id !== 'usa' ? ` · ≈ US$${fmt(summary.medianTuitionUsd)}` : ''}
            </span>
          </>
        ) : (
          <span className="muted">On request</span>
        ),
    ],
    [
      'Tuition from',
      ({ country, summary }) =>
        summary?.tuitionFrom ? (
          <b>{money(country.id, summary.tuitionFrom)}</b>
        ) : (
          <span className="muted">On request</span>
        ),
    ],
    [
      'In our catalogue',
      ({ summary }) => (
        <>
          <b>{plural(summary?.institutions ?? 0, 'institution')}</b>
          <span className="muted small">{plural(summary?.courses ?? 0, 'course')}</span>
        </>
      ),
    ],
    [
      'Good to know',
      ({ country }) => (
        <>
          <b>{country.facts[3][0]}</b>
          <span className="muted small">{country.facts[3][1]}</span>
        </>
      ),
    ],
  ];

  return (
    <div className="compare-wrap">
      <table className="compare">
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Destination</span>
            </th>
            {summaries.map(({ country }) => (
              <th key={country.id} scope="col">
                <button className="compare__head" onClick={() => navigate(`/c/${country.id}`)}>
                  <img src={DEST_IMAGES[country.id]} alt="" />
                  <strong>{country.name}</strong>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, render]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              {summaries.map((item) => (
                <td key={item.country.id}>{render(item)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
