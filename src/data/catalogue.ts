/**
 * Catalogue loaders — the only place that reads bundle files (AGENTS.md §5).
 *
 * Two sources, one code path:
 *   • bundled snapshot  →  relative `data/*.json` (public/, copied into dist by Vite, so the
 *                          same URL works under `npm run dev` and inside the Tauri protocol)
 *   • updated bundle    →  absolute path from the `catalogue_active` Rust command, read through
 *                          the asset protocol (SPEC §7.2)
 *
 * In a plain browser (no Tauri) the command resolves to `null` and we always use the bundled
 * snapshot, which is what makes `npm run dev` and the offline app behave identically.
 *
 * Loading never blocks the UI on the shell: any failure falls back to the bundled snapshot.
 */

import type { ActiveBundle, Catalogue, CountryId, DetailFile } from './types';

const BUNDLE_FILE = 'catalogue.json';

type ActiveBundleInfo = { root: string; meta: ActiveBundle['meta']; source: string } | null;

let activeBundle: ActiveBundleInfo = null;
let cataloguePromise: Promise<Catalogue> | undefined;
const detailCache = new Map<CountryId, Promise<DetailFile>>();
let assetUrl: ((path: string) => string) | undefined;

/** Tauri v2 exposes `__TAURI_INTERNALS__` in the webview; absent on the browser dev server. */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
  return (await response.json()) as T;
}

/** Absolute disk path → a URL the webview can fetch (asset protocol), or the path unchanged. */
async function toUrl(path: string): Promise<string> {
  if (!isTauri()) return path;
  if (!assetUrl) {
    const { convertFileSrc } = await import('@tauri-apps/api/core');
    assetUrl = convertFileSrc;
  }
  return assetUrl(path);
}

async function bundleFile(relative: string): Promise<string> {
  if (!activeBundle) return `data/${relative}`;
  return toUrl(`${activeBundle.root.replace(/\/+$/, '')}/${relative}`);
}

/**
 * Asks Rust which bundle is active. `null` means "use the bundled snapshot"
 * (first run, no update yet, or running outside Tauri).
 */
async function resolveActiveBundle(): Promise<ActiveBundleInfo> {
  if (!isTauri()) return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<ActiveBundleInfo>('catalogue_active');
  } catch (err) {
    console.warn('catalogue_active failed, using the bundled snapshot', err);
    return null;
  }
}

/** Load the active catalogue once per session; re-resolves after `catalogue://updated` (FR-19). */
export function loadCatalogue(): Promise<Catalogue> {
  if (!cataloguePromise) {
    cataloguePromise = (async () => {
      activeBundle = await resolveActiveBundle();
      return readJson<Catalogue>(await bundleFile(BUNDLE_FILE));
    })();
  }
  return cataloguePromise;
}

/**
 * Load one country's long-form detail file, cached for the session (FR-18).
 * A failure resolves to an empty file so screens still render — never a dead end.
 */
export function loadDetail(country: CountryId): Promise<DetailFile> {
  const cached = detailCache.get(country);
  if (cached) return cached;

  const promise = (async (): Promise<DetailFile> => {
    await loadCatalogue(); // guarantees activeBundle is resolved before we build the URL
    return readJson<DetailFile>(await bundleFile(`details/${country}.json`));
  })().catch((err) => {
    console.warn(`Detail file for ${country} unavailable`, err);
    return { country, courses: {}, universities: {} } satisfies DetailFile;
  });

  detailCache.set(country, promise);
  return promise;
}

/** Called on `catalogue://updated` so the next load reads the new bundle (FR-19). */
export function resetCatalogueCache(): void {
  cataloguePromise = undefined;
  activeBundle = null;
  detailCache.clear();
}

/** Bundle provenance for the status popover and page footnotes (FR-21). */
export async function loadActiveBundle(): Promise<ActiveBundle | null> {
  const catalogue = await loadCatalogue();
  return {
    root: activeBundle?.root ?? 'data',
    source: activeBundle?.source ?? 'bundled',
    meta: {
      schemaVersion: catalogue.schemaVersion,
      built: catalogue.built,
      sourceGeneratedAt: catalogue.sourceGeneratedAt,
      fxDate: catalogue.fxDate,
      fx: catalogue.fx,
    },
    counts: catalogue.counts,
  };
}
