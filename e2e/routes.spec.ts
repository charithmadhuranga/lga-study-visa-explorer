/**
 * Every route, cold-loaded: renders its heading from real data, no errors, animations finish
 * in their final state (nothing stuck half-faded or offset), no horizontal overflow, and the
 * catalogue-backed page is ready within budget.
 */
import { expect, test } from '@playwright/test';
import {
  horizontalOverflow,
  instrument,
  open,
  ROUTES,
  stuckElements,
  waitForMotionToSettle,
} from './helpers';

/** Cold start to a data-backed screen (NFR-01 is 1.5 s on the office PC; CI is slower). */
const READY_BUDGET_MS = 4000;

for (const route of ROUTES) {
  test(`${route.name} renders cleanly`, async ({ page }, info) => {
    const tracked = await instrument(page);
    const ms = await open(page, route.hash);
    info.annotations.push({ type: 'metric', description: `${route.name} ready: ${ms} ms` });

    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible();
    expect(ms, `ready in ${ms} ms`).toBeLessThan(READY_BUDGET_MS);

    await waitForMotionToSettle(page);
    expect(await stuckElements(page)).toEqual([]);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

    // The top bar stays one tidy row: chapters never collide with the action buttons.
    if (route.name !== 'welcome') {
      const [nav, actions] = await Promise.all([
        page.locator('.chapters').boundingBox(),
        page.locator('.bar-actions').boundingBox(),
      ]);
      expect(nav && actions).toBeTruthy();
      if (nav && actions) {
        expect(nav.x + nav.width, 'chapters overlap the action buttons').toBeLessThanOrEqual(
          actions.x,
        );
        expect(Math.abs(nav.y - actions.y), 'top bar wrapped onto two rows').toBeLessThan(30);
      }
    }
    expect(tracked.errors).toEqual([]);
  });
}

test('unknown routes land on destinations, not a blank page', async ({ page }) => {
  await instrument(page);
  await open(page, '/no-such-page');
  await expect(page.getByRole('heading', { name: /where would you like to study/i })).toBeVisible();
});

test('a missing record shows a friendly empty state', async ({ page }) => {
  await instrument(page);
  await open(page, '/k/not-a-course');
  await expect(page.getByText('Course not found')).toBeVisible();
});
