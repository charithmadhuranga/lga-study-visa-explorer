/**
 * About LGA (FR-08) — chapter 01, the "who we are" slide: three services with icons, then
 * the four reasons to choose LGA. Copy from `content.ts`.
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { SERVICES, WHY } from '../data/content';
import { PageHeader } from '../components/PageHeader';
import { Icon, type IconName } from '../components/Icon';
import { useMotionEnabled } from '../animation/useMotionEnabled';

/** Presentation icons, in SERVICES order (admissions, visas, English tests). */
const SERVICE_ICONS: IconName[] = ['cap', 'passport', 'book'];

export function Services(): React.JSX.Element {
  const navigate = useNavigate();
  const root = useRef<HTMLElement>(null);
  const enabled = useMotionEnabled();

  useEffect(() => {
    if (!enabled) return;
    const ctx = gsap.context(() => {
      gsap.from('.service, .feature', {
        y: 28,
        opacity: 0,
        duration: 0.55,
        stagger: 0.07,
        ease: 'power3.out',
        clearProps: 'opacity,transform',
      });
    }, root);
    return () => ctx.revert();
  }, [enabled]);

  return (
    <section ref={root}>
      <PageHeader
        eyebrow="01 · About LGA"
        title="Everything you need to study abroad"
        lead="Three teams, one plan: admissions, visas and English tests working together on your application."
        actions={
          <button className="btn" onClick={() => navigate('/destinations')}>
            Choose a destination
            <Icon name="arrow-right" />
          </button>
        }
      />

      <div className="grid grid--3">
        {SERVICES.map(([title, bullets], i) => (
          <article className="panel service" key={title}>
            <span className="icon-badge">
              <Icon name={SERVICE_ICONS[i] ?? 'star'} />
            </span>
            <h2>{title}</h2>
            <ul className="tick">
              {bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="section">
        <h2>Why students choose LGA</h2>
        <div className="grid grid--4">
          {WHY.map(([title, body], i) => (
            <article className="card feature" key={title}>
              <span className="feature__num" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
