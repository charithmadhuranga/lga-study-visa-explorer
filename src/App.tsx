/** App shell: chrome (TopBar/Toast/IdleDialog), global keys, idle timer, boot loading. */

import { useEffect, useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
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

  // Every page starts at the top, before it paints. Plain scrollTo(0, 0): no smooth scrolling
  // and no ScrollBehavior option that older engines may reject.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      {!isWelcome && <TopBar />}
      {!isWelcome && <UpdateBanner />}
      {/*
        Page entrance is a CSS animation whose resting state is fully visible. It used to be a
        Motion opacity tween: in WebKitGTK (Tauri on Linux) that tween could stall at its start
        value, leaving every page after the first navigation invisible until a reload. A CSS
        animation that never runs still leaves the page visible. Keyed by route so each page
        mounts fresh (its own mount choreography, fresh state).
      */}
      <main key={location.pathname} className={motionEnabled ? 'page-enter' : undefined}>
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
      </main>
      <Toast />
      <IdleDialog onReset={handleIdleReset} />
    </>
  );
}
