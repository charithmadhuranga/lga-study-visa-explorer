/**
 * Sticky top bar (DESIGN §5): brand → welcome, the five numbered presentation chapters
 * (SPEC FR-27) with a sliding active pill, the shortlist count on chapter 04, and two
 * presenter controls — appearance (dark/light) and full screen (FR-13/FR-14/FR-25).
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import logo from '../assets/img/logo.png';
import { CHAPTERS, chapterIndex } from '../data/chapters';
import { useSession } from '../store/session';
import { useAppearance } from '../store/appearance';
import { spring } from '../animation/variants';
import { useMotionEnabled } from '../animation/useMotionEnabled';
import { toggleFullscreen } from '../shell/window';
import { Icon } from './Icon';

export function TopBar(): React.JSX.Element {
  const count = useSession((s) => s.shortlist.length);
  const mode = useAppearance((s) => s.mode);
  const setMode = useAppearance((s) => s.setMode);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const enabled = useMotionEnabled();
  const current = chapterIndex(pathname);
  const isLight = mode === 'light';

  return (
    <header className="topbar">
      <button className="brand" onClick={() => navigate('/')} aria-label="LGA Visa, welcome screen">
        <img src={logo} alt="" />
        <span>
          <b>LGA VISA</b>
          <small>STUDY VISA EXPLORER</small>
        </span>
      </button>

      <nav className="chapters" aria-label="Consultation chapters">
        {CHAPTERS.map((chapter, i) => {
          const active = i === current;
          const isShortlist = chapter.path === '/shortlist';
          return (
            <Link
              key={chapter.path}
              to={chapter.path}
              className="chapter"
              aria-current={active ? 'page' : undefined}
              aria-label={isShortlist ? `${chapter.long}, ${count} courses` : undefined}
            >
              {active && (
                <motion.span
                  className="chapter__ink"
                  layoutId="chapter-ink"
                  transition={enabled ? spring : { duration: 0 }}
                />
              )}
              <span className="chapter__num">{chapter.num}</span>
              <span>{chapter.label}</span>
              {isShortlist && count > 0 && (
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={count}
                    className="badge"
                    initial={enabled ? { scale: 0.6, opacity: 0 } : false}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={enabled ? { scale: 0.6, opacity: 0 } : undefined}
                    transition={enabled ? spring : { duration: 0 }}
                  >
                    {count}
                  </motion.span>
                </AnimatePresence>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="bar-actions">
        <button
          className="icon-btn"
          onClick={() => setMode(isLight ? 'dark' : 'light')}
          aria-label={isLight ? 'Switch to dark appearance' : 'Switch to light appearance'}
          title={isLight ? 'Dark appearance' : 'Light appearance'}
        >
          <Icon name={isLight ? 'moon' : 'sun'} />
        </button>
        <button
          className="icon-btn"
          onClick={() => void toggleFullscreen()}
          aria-label="Toggle full screen (F11)"
          title="Full screen (F11)"
        >
          <Icon name="expand" />
        </button>
      </div>
    </header>
  );
}
