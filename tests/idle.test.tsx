/** Idle reset integration (FR-12): silence opens the dialog, its countdown resets the session. */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { IdleDialog } from '../src/components/IdleDialog';
import { useIdleTimer } from '../src/hooks/useIdleTimer';
import { useSession } from '../src/store/session';

function Harness(): React.JSX.Element {
  const onReset = useIdleTimer();
  const phase = useSession((s) => s.idle);
  const shortlist = useSession((s) => s.shortlist);
  return (
    <>
      <span data-testid="phase">{phase}</span>
      <span data-testid="count">{shortlist.length}</span>
      <IdleDialog onReset={onReset} />
    </>
  );
}

function renderHarness(): void {
  const router = createMemoryRouter(
    [
      { path: '/', element: <Harness /> },
      { path: '/destinations', element: <div>destinations</div> },
    ],
    { initialEntries: ['/'] },
  );
  render(<RouterProvider router={router} />);
}

const MINUTE = 60 * 1000;

/** Timer advances must run inside act() so React flushes the state updates. */
const tick = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

describe('idle timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSession.getState().resetSession();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens the dialog after 4 minutes of silence', () => {
    renderHarness();
    expect(screen.getByTestId('phase')).toHaveTextContent('active');

    tick(4 * MINUTE);
    expect(screen.getByTestId('phase')).toHaveTextContent('dialog');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('resets the session when the 20-second countdown expires', () => {
    useSession.getState().toggleShortlist('course-1');
    renderHarness();
    expect(screen.getByTestId('count')).toHaveTextContent('1');

    tick(4 * MINUTE);
    expect(screen.getByTestId('phase')).toHaveTextContent('dialog');

    tick(20 * 1000);
    expect(screen.getByTestId('phase')).toHaveTextContent('active');
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('any pointer input while the dialog is open restarts its countdown', () => {
    renderHarness();
    tick(4 * MINUTE);
    expect(screen.getByTestId('phase')).toHaveTextContent('dialog');

    tick(10 * 1000);
    fireEvent.pointerDown(document.body); // 10 s into the countdown
    tick(10 * 1000);
    expect(screen.getByTestId('phase')).toHaveTextContent('dialog');

    tick(9 * 1000);
    expect(screen.getByTestId('phase')).toHaveTextContent('dialog');
    tick(2 * 1000);
    expect(screen.getByTestId('phase')).toHaveTextContent('active');
  });

  it('"Continue consultation" cancels the reset', () => {
    renderHarness();
    tick(4 * MINUTE);
    fireEvent.click(screen.getByRole('button', { name: /continue consultation/i }));
    expect(screen.getByTestId('phase')).toHaveTextContent('active');

    tick(30 * 1000);
    expect(screen.getByTestId('phase')).toHaveTextContent('active');
  });

  it('input before the deadline postpones the dialog', () => {
    renderHarness();
    tick(3 * MINUTE);
    fireEvent.pointerDown(document.body);
    tick(3 * MINUTE);
    expect(screen.getByTestId('phase')).toHaveTextContent('active');
    tick(MINUTE);
    expect(screen.getByTestId('phase')).toHaveTextContent('dialog');
  });
});
