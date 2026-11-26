/** App self-update (FR-24): offered on a schedule, installed only after an explicit click. */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHECK_EVERY_MS,
  FIRST_CHECK_MS,
  resetAppUpdateForTests,
  updaterBackend,
  useAppUpdate,
  type DownloadEvent,
  type PendingUpdate,
} from '../src/store/appUpdate';
import { UpdateBanner } from '../src/components/UpdateBanner';

function fakeUpdate(): PendingUpdate & { downloadAndInstall: ReturnType<typeof vi.fn> } {
  return {
    version: '2.1.0',
    body: 'Notes',
    downloadAndInstall: vi.fn(async (onEvent?: (e: DownloadEvent) => void) => {
      onEvent?.({ event: 'Started', data: { contentLength: 100 } });
      onEvent?.({ event: 'Progress', data: { chunkLength: 40 } });
      onEvent?.({ event: 'Progress', data: { chunkLength: 60 } });
      onEvent?.({ event: 'Finished' });
    }),
  };
}

const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('app self-update', () => {
  beforeEach(() => {
    resetAppUpdateForTests();
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
  });
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
    vi.restoreAllMocks();
  });

  it('is unsupported in the browser and schedules nothing', () => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
    const check = vi.spyOn(updaterBackend, 'check');
    useAppUpdate.getState().init();
    expect(useAppUpdate.getState().state).toBe('unsupported');
    expect(check).not.toHaveBeenCalled();
  });

  it('checks 10 s after launch and daily, and never installs on its own', async () => {
    vi.useFakeTimers();
    const update = fakeUpdate();
    const check = vi.spyOn(updaterBackend, 'check').mockResolvedValue(update);
    const relaunch = vi.spyOn(updaterBackend, 'relaunch').mockResolvedValue();

    useAppUpdate.getState().init();
    vi.advanceTimersByTime(FIRST_CHECK_MS - 1);
    expect(check).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    await flush();
    expect(check).toHaveBeenCalledTimes(1);
    expect(useAppUpdate.getState()).toMatchObject({ state: 'available', version: '2.1.0' });

    vi.advanceTimersByTime(CHECK_EVERY_MS);
    await flush();
    expect(check).toHaveBeenCalledTimes(2);
    expect(update.downloadAndInstall).not.toHaveBeenCalled();
    expect(relaunch).not.toHaveBeenCalled();
  });

  it('downloads with progress and relaunches only after the click', async () => {
    const update = fakeUpdate();
    vi.spyOn(updaterBackend, 'check').mockResolvedValue(update);
    const relaunch = vi.spyOn(updaterBackend, 'relaunch').mockResolvedValue();
    await useAppUpdate.getState().check();

    render(<UpdateBanner />);
    expect(screen.getByText(/version 2.1.0 is ready/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /restart & update/i }));
    await flush();

    expect(update.downloadAndInstall).toHaveBeenCalledTimes(1);
    expect(relaunch).toHaveBeenCalledTimes(1);
    expect(useAppUpdate.getState()).toMatchObject({ state: 'restarting', progress: 1 });
  });

  it('a failed check is quiet; a failed install keeps the offer open', async () => {
    vi.spyOn(updaterBackend, 'check').mockRejectedValueOnce(new Error('feed unreachable'));
    await useAppUpdate.getState().check();
    expect(useAppUpdate.getState()).toMatchObject({ state: 'error', error: 'feed unreachable' });

    const update = fakeUpdate();
    update.downloadAndInstall.mockRejectedValueOnce(new Error('signature mismatch'));
    vi.spyOn(updaterBackend, 'check').mockResolvedValue(update);
    const relaunch = vi.spyOn(updaterBackend, 'relaunch').mockResolvedValue();
    await useAppUpdate.getState().check();
    await useAppUpdate.getState().install();
    expect(useAppUpdate.getState()).toMatchObject({
      state: 'available',
      error: 'signature mismatch',
    });
    expect(relaunch).not.toHaveBeenCalled();
  });

  it('"Later" hides the banner for that version', async () => {
    vi.spyOn(updaterBackend, 'check').mockResolvedValue(fakeUpdate());
    await useAppUpdate.getState().check();
    render(<UpdateBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    await flush();
    expect(useAppUpdate.getState().dismissed).toBe('2.1.0');
  });
});
