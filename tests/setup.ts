/**
 * Vitest setup: jest-dom matchers plus the browser APIs jsdom does not implement.
 * The reduced-motion query drives every animation path (NFR-11), so it must exist in tests
 * and default to "motion enabled" unless a test opts out.
 */

import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

type MediaListener = (event: MediaQueryListEvent) => void;

export function mockMatchMedia(reduced = false): void {
  const listeners = new Set<MediaListener>();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList => {
      const matches = query.includes('prefers-reduced-motion') ? reduced : false;
      return {
        matches,
        media: query,
        onchange: null,
        addListener: (listener: MediaListener) => listeners.add(listener),
        removeListener: (listener: MediaListener) => listeners.delete(listener),
        addEventListener: (_: string, listener: MediaListener) => listeners.add(listener),
        removeEventListener: (_: string, listener: MediaListener) => listeners.delete(listener),
        dispatchEvent: () => false,
      } as MediaQueryList;
    },
  });
}

mockMatchMedia(false);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.localStorage.clear();
});
