/** App shell: chrome (TopBar/Toast/IdleDialog), global keys, idle timer, boot loading. */

import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { TopBar } from './components/TopBar';
import { Toast } from './components/Toast';
import { IdleDialog } from './components/IdleDialog';
import { EmptyState } from './components/EmptyState';
import { useGlobalKeys } from './hooks/useGlobalKeys';
import { useIdleTimer } from './hooks/useIdleTimer';
import { useCatalogue } from './store/catalogue';
import { useAppearance } from './store/appearance';
import { useUpdates } from './store/updates';
import { useAppUpdate } from './store/appUpdate';
import { UpdateBanner } from './components/UpdateBanner';
import { pageVariants } from './animation/variants';
import { useMotionEnabled } from './animation/useMotionEnabled';

export default function App(): React.JSX.Element {
  useGlobalKeys();
  const handleIdleReset = useIdleTimer();
  const location = useLocation();
  const motionEnabled = useMotionEnabled();

  const loadCatalogue = useCatalogue((s) => s.load);
  const index = useCatalogue((s) => s.index);
  const error = useCatalogue((s) => s.error);
  const initAppearance = useAppearance((s) => s.init);
  const initUpdates = useUpdates((s) => s.init);
  const initAppUpdate = useAppUpdate((s) => s.init);

  useEffect(() => {
    void initAppearance();
    // The catalogue renders first; the updater listener attaches afterwards (SPEC §8.1).
    void loadCatalogue().then(() => {
      initUpdates();
      initAppUpdate(); // first app-update check 10 s later (FR-24)
    });
  }, [initAppearance, loadCatalogue, initUpdates, initAppUpdate]);

  const isWelcome = location.pathname === '/' || location.pathname === '/welcome';

  return (
    <>
      {!isWelcome && <TopBar />}
      {!isWelcome && <UpdateBanner />}
      <AnimatePresence
        mode="wait"
        initial={false}
        onExitComplete={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}
      >
        <motion.main
          key={location.pathname}
          variants={pageVariants}
          initial={motionEnabled ? 'initial' : false}
          animate={motionEnabled ? 'enter' : { opacity: 1, y: 0 }}
          exit={motionEnabled ? 'exit' : { opacity: 1, y: 0 }}
        >
          {isWelcome ? (
            <Outlet />
          ) : (
            <div className="wrap">
              {error ? (
                <EmptyState
                  icon="info"
                  title="Catalogue unavailable"
                  hint={`${error} — restart the app to reload the bundled catalogue.`}
                />
              ) : index === null ? (
                <div className="loading" role="status">
                  Loading the course catalogue…
                </div>
              ) : (
                <Outlet />
              )}
            </div>
          )}
        </motion.main>
      </AnimatePresence>
      <Toast />
      <IdleDialog onReset={handleIdleReset} />
    </>
  );
}
