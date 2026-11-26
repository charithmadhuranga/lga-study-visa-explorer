/**
 * Catalogue status chip + popover (FR-20, FR-21, FR-25). The chip says how fresh the data is;
 * the popover shows where the numbers come from, offers "Check for updates" and the full
 * Auto / Light / Dark appearance choice. Closes on Esc or an outside click.
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { dayMonth, fmt } from '../data/format';
import { useCatalogue } from '../store/catalogue';
import { statusChip, useUpdates } from '../store/updates';
import { useAppearance, type ThemeMode } from '../store/appearance';
import { useMotionEnabled } from '../animation/useMotionEnabled';
import { isTauri } from '../data/catalogue';
import { Segmented } from './Segmented';
import { Icon } from './Icon';

const BUSY = new Set(['checking', 'downloading', 'installing']);

export function StatusPopover(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const enabled = useMotionEnabled();
  const status = useUpdates((s) => s.status);
  const checkNow = useUpdates((s) => s.checkNow);
  const index = useCatalogue((s) => s.index);
  const mode = useAppearance((s) => s.mode);
  const setMode = useAppearance((s) => s.setMode);

  const catalogue = index?.catalogue;
  const chip = statusChip(status, catalogue?.built);
  const busy = BUSY.has(status.state);
  const desktop = isTauri();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    const onDown = (e: PointerEvent): void => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <div className="status" ref={root}>
      <button
        className="status-chip"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Course catalogue: ${chip.label}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`status-chip__dot status-chip__dot--${chip.tone}`} aria-hidden="true" />
        <span className="status-chip__label">{chip.label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="status-pop"
            role="dialog"
            aria-label="Course catalogue status"
            initial={enabled ? { opacity: 0, y: -8, scale: 0.98 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={enabled ? { opacity: 0, y: -6 } : { opacity: 0 }}
            transition={{ duration: enabled ? 0.2 : 0 }}
          >
            <div className="eyebrow">Course catalogue</div>
            <h3>{chip.label}</h3>

            {catalogue && (
              <dl className="status-pop__facts">
                <div>
                  <dt>Catalogue built</dt>
                  <dd>{dayMonth(catalogue.built)}</dd>
                </div>
                <div>
                  <dt>Source data from</dt>
                  <dd>{dayMonth(catalogue.sourceGeneratedAt.slice(0, 10))}</dd>
                </div>
                <div>
                  <dt>In the catalogue</dt>
                  <dd>
                    {fmt(catalogue.counts.courses)} courses · {fmt(catalogue.counts.universities)}{' '}
                    institutions
                  </dd>
                </div>
                <div>
                  <dt>Exchange rates</dt>
                  <dd>{catalogue.fxDate}</dd>
                </div>
              </dl>
            )}

            {status.message && status.state !== 'up-to-date' && (
              <p className="status-pop__note">
                <Icon name="info" />
                <span>
                  {status.state === 'offline'
                    ? 'No connection right now. Everything keeps working with the data shown.'
                    : status.message}
                  {status.retryInSecs
                    ? ` Next try in ${Math.ceil(status.retryInSecs / 60)} min.`
                    : ''}
                </span>
              </p>
            )}

            {desktop ? (
              <button
                className="btn btn--sm btn--block"
                disabled={busy}
                onClick={() => void checkNow()}
              >
                <Icon name="refresh" />
                {busy ? 'Checking…' : 'Check for updates'}
              </button>
            ) : (
              <p className="muted small">Automatic updates run in the desktop app.</p>
            )}

            <div className="status-pop__appearance">
              <span className="small muted">Appearance</span>
              <Segmented<ThemeMode>
                id="appearance"
                label="Appearance"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'auto', label: 'Auto' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
