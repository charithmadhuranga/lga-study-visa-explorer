/**
 * Shared e2e helpers: error tracking, "app ready", animation-settle detection and the glitch
 * detectors (stuck elements, overflow, long tasks) the specs assert on.
 */
import { expect, test, type Page, type TestInfo } from '@playwright/test';

/** Real records from the bundled snapshot. */
export const IDS = {
  university: 'university-of-edinburgh',
  course: '5l12',
  country: 'uk',
} as const;

export const ROUTES: { name: string; hash: string; heading: RegExp }[] = [
  { name: 'welcome', hash: '/welcome', heading: /study abroad with/i },
  { name: 'about', hash: '/services', heading: /everything you need/i },
  { name: 'destinations', hash: '/destinations', heading: /where would you like to study/i },
  { name: 'country', hash: `/c/${IDS.country}`, heading: /study in united kingdom/i },
  { name: 'university', hash: `/u/${IDS.university}`, heading: /university of edinburgh/i },
  { name: 'course', hash: `/k/${IDS.course}`, heading: /master of laws/i },
  { name: 'finder', hash: '/finder', heading: /find the right course/i },
  { name: 'shortlist', hash: '/shortlist', heading: /your shortlist/i },
  { name: 'journey', hash: '/journey', heading: /your journey with lga/i },
];

export interface Tracked {
  errors: string[];
}

/** Collect console errors, uncaught exceptions and failed requests; install perf observers. */
export async function instrument(page: Page): Promise<Tracked> {
  const tracked: Tracked = { errors: [] };
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    // Blocked remote logos report a load error; the crest fallback is the expected behaviour.
    const source = msg.location().url;
    if (source && !source.startsWith('http://localhost')) return;
    tracked.errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => tracked.errors.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => {
    // Remote university logos may be blocked in CI; the crest fallback covers them.
    if (!req.url().startsWith('http://localhost')) return;
    tracked.errors.push(`requestfailed: ${req.url()} ${req.failure()?.errorText ?? ''}`);
  });
  await page.addInitScript(() => {
    const w = window as unknown as { __longtasks: number[]; __cls: number };
    w.__longtasks = [];
    w.__cls = 0;
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) w.__longtasks.push(e.duration);
      }).observe({ type: 'longtask', buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as (PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        })[]) {
          if (!e.hadRecentInput) w.__cls += e.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {
      /* WebKit has neither observer — the specs skip those assertions there */
    }
  });
  // "Office PC" projects: throttle the CPU so slowness shows up here, not in front of a customer.
  if (test.info().project.name.includes('slow-cpu')) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  // Remote logos are not part of what we test; never let them slow a run.
  await page.route(/^https:\/\/(photos\.applyboard\.com|[a-z]+\.wikimedia\.org)\//, (route) =>
    route.abort(),
  );
  return tracked;
}

/** Navigate and wait until the catalogue-backed page is on screen. */
export async function open(page: Page, hash: string): Promise<number> {
  const start = Date.now();
  await page.goto(`/#${hash}`);
  await waitForReady(page);
  return Date.now() - start;
}

export async function waitForReady(page: Page): Promise<void> {
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByText('Loading the course catalogue')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

/**
 * Wait until nothing on screen is moving: no running Web Animations and the opacity/transform
 * of every element in the app is unchanged across two samples (covers GSAP inline tweens).
 */
export async function waitForMotionToSettle(page: Page, timeout = 6000): Promise<void> {
  const signature = (): Promise<string> =>
    page.evaluate(() => {
      const running = document
        .getAnimations()
        .filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity);
      const els = document.querySelectorAll('#root *');
      let sig = `${running.length}|`;
      for (let i = 0; i < els.length && i < 1500; i++) {
        const s = getComputedStyle(els[i]);
        sig += `${s.opacity},${s.transform};`;
      }
      return sig;
    });
  // The app flags its own GSAP entrances; wait for those to finish first.
  await page.waitForFunction(() => !document.documentElement.dataset.animating, undefined, {
    timeout,
  });
  const until = Date.now() + timeout;
  let previous = await signature();
  while (Date.now() < until) {
    await page.waitForTimeout(150);
    const next = await signature();
    const nothingRunning = next.startsWith('0|');
    if (next === previous && nothingRunning) return;
    previous = next;
  }
  throw new Error('Animations did not settle');
}

/**
 * Elements that are visible in layout but stuck semi-transparent or offset after motion has
 * settled — the "half-faded card / jumped element" glitch.
 */
export async function stuckElements(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const describe = (el: Element): string => {
      const cls = typeof el.className === 'string' ? el.className.split(' ')[0] : '';
      const text = (el.textContent ?? '').trim().slice(0, 40);
      return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} "${text}"`;
    };
    for (const el of document.querySelectorAll('#root main *, #root header *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.bottom < 0 || r.top > innerHeight) continue; // off-screen content is not the point
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden') continue;
      if (el.closest('[disabled]')) continue; // disabled buttons are dimmed on purpose
      if (Number(s.opacity) < 0.99) out.push(`opacity ${s.opacity}: ${describe(el)}`);
      // Hover/focus transforms aside, nothing should rest translated.
      if (s.transform !== 'none' && /matrix\(1, 0, 0, 1, (?!0, 0\))/.test(s.transform)) {
        out.push(`translated ${s.transform}: ${describe(el)}`);
      }
    }
    return out;
  });
}

export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
}

export async function longTasks(page: Page): Promise<number[]> {
  return page.evaluate(() => (window as unknown as { __longtasks: number[] }).__longtasks.slice());
}

export async function resetLongTasks(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __longtasks: number[] }).__longtasks = [];
  });
}

export function isChromium(info: TestInfo): boolean {
  return info.project.name.startsWith('chromium');
}

export function reducedMotion(info: TestInfo): boolean {
  return info.project.name.includes('reduced-motion');
}
