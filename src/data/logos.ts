/**
 * Logo URL resolution (FR-22). In the desktop app a logo the cache already holds is served
 * from disk through the asset protocol — so it still shows with the internet down. A miss
 * falls back to the remote URL (and Rust caches it in the background for next time); if that
 * fails too, `LogoBadge` shows the crest. In the browser it is always the remote URL.
 */

import { isTauri } from './catalogue';

const resolved = new Map<string, Promise<string>>();

export function resolveLogo(url: string): Promise<string> {
  if (!url || !isTauri()) return Promise.resolve(url);
  const cached = resolved.get(url);
  if (cached) return cached;

  const promise = (async (): Promise<string> => {
    try {
      const { invoke, convertFileSrc } = await import('@tauri-apps/api/core');
      const path = await invoke<string | null>('logo_src', { url });
      return path ? convertFileSrc(path) : url;
    } catch {
      return url;
    }
  })();
  resolved.set(url, promise);
  return promise;
}

/** Whether logos resolve asynchronously (desktop) — the badge waits instead of flashing. */
export function logosResolveAsync(): boolean {
  return isTauri();
}
