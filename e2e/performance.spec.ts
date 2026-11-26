/**
 * Responsiveness (NFR-02/03/04): no script task long enough to freeze the screen during
 * navigation or filtering, and filters answer quickly over the full 4,225-course catalogue.
 * Long-task timing is Chromium-only (WebKit has no Long Tasks API).
 */
import { expect, test } from '@playwright/test';
import {
  IDS,
  instrument,
  isChromium,
  longTasks,
  open,
  resetLongTasks,
  waitForMotionToSettle,
} from './helpers';

/**
 * A task this long is a visible freeze. NFR-04 targets 50 ms on the office PC; budgets here
 * leave headroom for parallel test workers sharing the CPU. The slow-CPU project (4× throttle)
 * gets 250 ms — about 60 ms on a normal CPU (measured in isolation: ~75 ms throttled).
 */
const freezeBudget = (project: string): number => (project.includes('slow-cpu') ? 250 : 200);

test('route changes never freeze the UI', async ({ page }, info) => {
  test.skip(!isChromium(info), 'Long Tasks API is Chromium-only');
  await instrument(page);
  await open(page, '/destinations');
  await waitForMotionToSettle(page);

  const journey = [
    `/c/${IDS.country}`,
    `/u/${IDS.university}`,
    `/k/${IDS.course}`,
    '/finder',
    '/destinations',
    '/c/usa',
    '/c/canada',
  ];
  const worst: Record<string, number> = {};
  for (const hash of journey) {
    await resetLongTasks(page);
    await page.evaluate((h) => {
      location.hash = h;
    }, hash);
    await expect(page.locator('main h1').first()).toBeVisible();
    await waitForMotionToSettle(page);
    worst[hash] = Math.max(0, ...(await longTasks(page)));
  }
  info.annotations.push({
    type: 'metric',
    description: `longest task per route (ms): ${JSON.stringify(Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, Math.round(v)])))}`,
  });
  for (const [hash, ms] of Object.entries(worst)) {
    expect(ms, `${hash} longest task ${Math.round(ms)} ms`).toBeLessThan(
      freezeBudget(info.project.name),
    );
  }
});

test('course finder search responds while typing', async ({ page }, info) => {
  await instrument(page);
  await open(page, '/finder');
  await waitForMotionToSettle(page);
  if (isChromium(info)) await resetLongTasks(page);

  const search = page.getByRole('searchbox', { name: 'Search' });
  const t0 = Date.now();
  await search.pressSequentially('data science', { delay: 40 });
  await expect(page.locator('.results-head h2')).not.toContainText('4,225');
  const elapsed = Date.now() - t0;
  info.annotations.push({ type: 'metric', description: `typing + results: ${elapsed} ms` });
  // 12 keystrokes at 40 ms ≈ 0.5 s of typing; results must keep up.
  expect(elapsed, `typing + results took ${elapsed} ms`).toBeLessThan(2500);
  if (isChromium(info)) {
    const worst = Math.max(0, ...(await longTasks(page)));
    expect(worst, `longest task while typing ${Math.round(worst)} ms`).toBeLessThan(
      freezeBudget(info.project.name),
    );
  }
});

test('filter chips and paging respond immediately', async ({ page }, info) => {
  await instrument(page);
  await open(page, `/c/${IDS.country}`);
  await waitForMotionToSettle(page);
  if (isChromium(info)) await resetLongTasks(page);

  const before = await page.locator('.results-head h2').textContent();
  await page.locator('.rail .chips button').first().click();
  await expect(page.locator('.results-head h2')).not.toHaveText(before ?? '');
  const more = page.getByRole('button', { name: /show 24 more/i });
  if (await more.count()) await more.click();
  await page.getByText('Clear all').click();
  await expect(page.locator('.results-head h2')).toHaveText(before ?? '');
  if (isChromium(info)) {
    const worst = Math.max(0, ...(await longTasks(page)));
    expect(worst, `longest task ${Math.round(worst)} ms`).toBeLessThan(
      freezeBudget(info.project.name),
    );
  }
});

test('the detail file for a country loads once and fast', async ({ page }) => {
  await instrument(page);
  const detailRequests: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/data/details/')) detailRequests.push(r.url());
  });
  await open(page, `/u/${IDS.university}`);
  await expect(page.locator('.prose').first()).not.toBeEmpty();
  await page.evaluate((h) => {
    location.hash = h;
  }, `/k/${IDS.course}`);
  await expect(page.getByText('Loading course details…')).toHaveCount(0, { timeout: 3000 });
  expect(detailRequests.filter((u) => u.includes('uk.json')).length).toBeLessThanOrEqual(1);
});
