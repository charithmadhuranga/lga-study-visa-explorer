/**
 * Global keyboard map (FR-13, FR-27):
 *   Esc            back (blurs a focused field first)
 *   Home           destinations
 *   PageDown/Up    next / previous presentation chapter (what a presentation clicker sends)
 *   F11            toggle full screen (inert in kiosk mode)
 *   Ctrl/Cmd+Q     quit
 * ← / → only apply on a course page and are handled by the Course screen itself, because
 * they need the sibling list. Nothing is swallowed while a text field is focused.
 */

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { adjacentChapter } from '../data/chapters';
import { quitApp, toggleFullscreen } from '../shell/window';

export function useGlobalKeys(): void {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.isContentEditable);

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'q') {
        event.preventDefault();
        void quitApp();
        return;
      }
      if (event.key === 'F11') {
        event.preventDefault();
        void toggleFullscreen();
        return;
      }
      if (event.key === 'Escape') {
        if (typing && target) target.blur();
        else if (window.history.length > 1) navigate(-1);
        return;
      }
      if (typing) return;
      if (event.key === 'Home') {
        event.preventDefault();
        navigate('/destinations');
        return;
      }
      if (event.key === 'PageDown' || event.key === 'PageUp') {
        const to = adjacentChapter(pathname, event.key === 'PageDown' ? 1 : -1);
        if (to) {
          event.preventDefault();
          navigate(to);
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, pathname]);
}
