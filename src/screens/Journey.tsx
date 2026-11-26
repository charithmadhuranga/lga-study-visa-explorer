/**
 * Next steps (FR-09) — chapter 05, the closing slide: the six-step process as a timeline,
 * the document checklists, and a call to action with LGA's contact details so every
 * consultation ends on "here is what happens next". Copy from `content.ts`.
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { DOCS, STEPS } from '../data/content';
import { PageHeader } from '../components/PageHeader';
import { SourceNote } from '../components/SourceNote';
import { ContactLine } from '../components/ContactLine';
import { Icon } from '../components/Icon';
import { useSession } from '../store/session';
import { useMotionEnabled } from '../animation/useMotionEnabled';

export function Journey(): React.JSX.Element {
  const navigate = useNavigate();
  const root = useRef<HTMLElement>(null);
  const enabled = useMotionEnabled();
  const shortlisted = useSession((s) => s.shortlist.length);

  useEffect(() => {
    if (!enabled) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('.journey li', { y: 24, opacity: 0, duration: 0.5, stagger: 0.08 })
        .from('.cta-band', { y: 24, opacity: 0, duration: 0.6 }, '-=0.1');
    }, root);
    return () => ctx.revert();
  }, [enabled]);

  return (
    <section ref={root}>
      <PageHeader
        eyebrow="05 · Next steps"
        title="Your journey with LGA"
        lead="From your first free consultation to the day you fly, one team guides every step."
      />

      <ol className="journey">
        {STEPS.map(([title, body]) => (
          <li key={title}>
            <h3>{title}</h3>
            <p>{body}</p>
          </li>
        ))}
      </ol>

      <h2>Documents you will need</h2>
      <div className="grid grid--2 section-tight">
        {DOCS.map(([title, bullets]) => (
          <div className="panel" key={title}>
            <h3>{title}</h3>
            <ul className="tick">
              {bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="cta-band on-navy">
        <div>
          <div className="eyebrow">Ready when you are</div>
          <h2>Let’s start your application</h2>
          <p className="lead">
            {shortlisted
              ? `You have ${shortlisted} course${shortlisted === 1 ? '' : 's'} shortlisted. Your counsellor will check entry requirements and plan the next step with you today.`
              : 'Your counsellor will check entry requirements for your profile and plan the next step with you today.'}
          </p>
          <ContactLine className="cta-band__contact" />
        </div>
        <div className="page-head__actions">
          <button className="btn btn--lg" onClick={() => navigate('/shortlist')}>
            <Icon name="star" />
            Review shortlist
          </button>
        </div>
      </div>

      <SourceNote>
        Your final checklist depends on the destination, course and visa type; we confirm yours
        during counselling. Never move large sums into your account just before applying without
        guidance: unexplained deposits are a common refusal reason.
      </SourceNote>
    </section>
  );
}
