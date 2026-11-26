/**
 * App update banner (FR-24, DESIGN §5): a slim, dismissible offer under the top bar. Nothing
 * downloads or restarts until the consultant presses "Restart & update" — ideally between
 * customers.
 */

import { AnimatePresence, motion } from 'motion/react';
import { useAppUpdate } from '../store/appUpdate';
import { useMotionEnabled } from '../animation/useMotionEnabled';
import { Icon } from './Icon';

export function UpdateBanner(): React.JSX.Element {
  const enabled = useMotionEnabled();
  const state = useAppUpdate((s) => s.state);
  const version = useAppUpdate((s) => s.version);
  const dismissed = useAppUpdate((s) => s.dismissed);
  const progress = useAppUpdate((s) => s.progress);
  const error = useAppUpdate((s) => s.error);
  const install = useAppUpdate((s) => s.install);
  const dismiss = useAppUpdate((s) => s.dismiss);

  const busy = state === 'downloading' || state === 'restarting';
  const visible = (state === 'available' && dismissed !== version) || busy;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="update-banner"
          role="region"
          aria-label="App update"
          initial={enabled ? { opacity: 0, y: -12 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={enabled ? { opacity: 0, y: -12 } : { opacity: 0 }}
          transition={{ duration: enabled ? 0.25 : 0 }}
        >
          <Icon name="refresh" />
          <p>
            {busy ? (
              <>
                <b>Updating to version {version}…</b>{' '}
                {state === 'restarting'
                  ? 'Restarting now.'
                  : progress !== null
                    ? `${Math.round(progress * 100)}% downloaded.`
                    : 'Downloading.'}
              </>
            ) : (
              <>
                <b>Version {version} is ready.</b> The app restarts to apply it — best between
                consultations.{error ? ` Last attempt failed: ${error}` : ''}
              </>
            )}
          </p>
          {!busy && (
            <div className="update-banner__actions">
              <button className="btn btn--sm" onClick={() => void install()}>
                Restart &amp; update
              </button>
              <button className="link-btn" onClick={dismiss}>
                Later
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
