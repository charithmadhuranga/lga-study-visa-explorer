/**
 * Welcome (FR-01) — the room's resting screen and the opening slide of every consultation.
 * Full-bleed hero, headline, two ways in, live catalogue stats and contact details.
 * GSAP plays the entrance once, then everything is still (DESIGN §7.3).
 */

import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import hero from '../assets/img/hero.webp';
import logo from '../assets/img/logo.png';
import { COUNTRIES } from '../data/content';
import { fmt } from '../data/format';
import { CHAPTERS } from '../data/chapters';
import { useCatalogue } from '../store/catalogue';
import { useMotionEnabled } from '../animation/useMotionEnabled';
import { useMountAnimation } from '../animation/useMountAnimation';
import { useCountUp } from '../animation/useCountUp';
import { ContactLine } from '../components/ContactLine';
import { Icon } from '../components/Icon';

const LEAD_WORDS = ['Study', 'abroad', 'with', 'Sri', 'Lanka’s'];
const GOLD_WORDS = ['student', 'visa', 'specialists'];

export function Welcome(): React.JSX.Element {
  const navigate = useNavigate();
  const root = useRef<HTMLElement>(null);
  const enabled = useMotionEnabled();
  const index = useCatalogue((s) => s.index);

  const universityCount = index?.catalogue.counts.universities ?? 0;
  const courseCount = index?.catalogue.counts.courses ?? 0;

  const universities = useCountUp(universityCount, 1.2, enabled && !!index);
  const courses = useCountUp(courseCount, 1.4, enabled && !!index);

  useMountAnimation(
    root,
    ({ reveal }) => {
      reveal('.welcome__bg', { opacity: 0, duration: 0.8, ease: 'power1.out' }, 0);
      reveal('.welcome .brand', { y: -12, opacity: 0, duration: 0.5 }, 0.1);
      reveal('.welcome .eyebrow', { opacity: 0, duration: 0.4 }, 0.15);
      reveal('.welcome__title .word', { y: 36, opacity: 0, duration: 0.6, stagger: 0.05 }, 0.2);
      reveal('.welcome .lead', { y: 14, opacity: 0, duration: 0.5 }, 0.55);
      reveal('.welcome__cta', { y: 12, opacity: 0, duration: 0.45 }, 0.7);
      reveal('.stat', { y: 18, opacity: 0, duration: 0.45, stagger: 0.07 }, 0.8);
      reveal('.welcome__contact', { opacity: 0, duration: 0.5 }, 1.05);
    },
    [],
  );

  return (
    <section
      className="welcome on-navy"
      ref={root}
      style={{ ['--hero' as string]: `url(${hero})` } as React.CSSProperties}
    >
      <div className="welcome__bg" aria-hidden="true" />

      <button className="brand" onClick={() => navigate('/destinations')}>
        <img decoding="async" src={logo} alt="" />
        <span>
          <b>LGA VISA</b>
          <small>LANKA GLOBAL ACCESS</small>
        </span>
      </button>

      <div className="welcome__main">
        <div className="eyebrow">Free study visa consultation</div>
        <h1 className="welcome__title">
          {LEAD_WORDS.map((word) => (
            <span className="word" key={word}>
              {word}&nbsp;
            </span>
          ))}
          <em>
            {GOLD_WORDS.map((word, i) => (
              <span className="word" key={word}>
                {word}
                {i < GOLD_WORDS.length - 1 ? ' ' : ''}
              </span>
            ))}
          </em>
        </h1>
        <p className="lead">
          From choosing the right course to your visa approval, explore universities in Australia,
          Canada, the UK, New Zealand and the USA with your LGA counsellor.
        </p>
        <div className="welcome__cta">
          <button className="btn btn--lg" onClick={() => navigate(CHAPTERS[0].path)}>
            Start the consultation
            <Icon name="arrow-right" />
          </button>
          <button className="btn btn--lg btn--ghost" onClick={() => navigate('/destinations')}>
            <Icon name="globe" />
            Explore destinations
          </button>
        </div>
      </div>

      <div className="welcome__foot">
        <div className="stat-row">
          <div className="stat">
            <b>{fmt(universities)}</b>
            <span>universities &amp; colleges</span>
          </div>
          <div className="stat">
            <b>{fmt(courses)}</b>
            <span>courses to compare</span>
          </div>
          <div className="stat">
            <b>{COUNTRIES.length}</b>
            <span>study destinations</span>
          </div>
          <div className="stat">
            <b>Free</b>
            <span>first consultation</span>
          </div>
        </div>
        <ContactLine className="welcome__contact" />
      </div>
    </section>
  );
}
