/**
 * Moving around like a consultant: chapter nav, presentation clicker keys, drill-down,
 * breadcrumbs and Back. After every move the new page must be on screen, at the top, with the
 * correct chapter lit and nothing left mid-animation.
 */
import { expect, test, type Page } from '@playwright/test';
import { IDS, instrument, open, stuckElements, waitForMotionToSettle } from './helpers';

/** The sliding white pill must sit on the active chapter (the "ink in the wrong place" glitch). */
async function inkOnActiveChapter(page: Page): Promise<void> {
  const active = page.locator('.chapter[aria-current="page"]');
  await expect(active).toHaveCount(1);
  const ink = active.locator('.chapter__ink');
  await expect(ink).toBeVisible();
  const [a, i] = await Promise.all([active.boundingBox(), ink.boundingBox()]);
  expect(a && i).toBeTruthy();
  if (!a || !i) return;
  expect(Math.abs(a.x - i.x)).toBeLessThan(2);
  expect(Math.abs(a.width - i.width)).toBeLessThan(2);
}

async function settledAt(page: Page, heading: RegExp, chapter?: string): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  await waitForMotionToSettle(page);
  if (chapter) {
    await expect(page.locator('.chapter[aria-current="page"]')).toContainText(chapter);
    await inkOnActiveChapter(page);
  }
  expect(await stuckElements(page)).toEqual([]);
}

test('chapter nav walks the whole pitch', async ({ page }) => {
  const tracked = await instrument(page);
  await open(page, '/services');
  const steps: [string, RegExp][] = [
    ['Destinations', /where would you like to study/i],
    ['Courses', /find the right course/i],
    ['Shortlist', /your shortlist/i],
    ['Next steps', /your journey with lga/i],
    ['About LGA', /everything you need/i],
  ];
  for (const [label, heading] of steps) {
    await page.getByRole('navigation', { name: 'Consultation chapters' }).getByText(label).click();
    await settledAt(page, heading, label);
  }
  expect(tracked.errors).toEqual([]);
});

test('presentation clicker keys step through chapters', async ({ page }) => {
  await instrument(page);
  await open(page, '/welcome');
  await page.keyboard.press('PageDown');
  await settledAt(page, /everything you need/i, 'About LGA');
  await page.keyboard.press('PageDown');
  await settledAt(page, /where would you like to study/i, 'Destinations');
  await page.keyboard.press('PageUp');
  await settledAt(page, /everything you need/i, 'About LGA');
});

test('drill-down from destinations to a course and back with breadcrumbs', async ({ page }) => {
  const tracked = await instrument(page);
  await open(page, '/destinations');
  await page
    .getByRole('button', { name: /united kingdom/i })
    .first()
    .click();
  await settledAt(page, /study in united kingdom/i, 'Destinations');

  await page.locator('.uni-card').first().click();
  await expect(page.locator('.uni-hero h1')).toBeVisible();
  await waitForMotionToSettle(page);

  await page.locator('.course-row').first().click();
  await expect(page.locator('.course-head h1')).toBeVisible();
  await settledAt(page, /.+/, 'Courses');

  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByText('United Kingdom').click();
  await settledAt(page, /study in united kingdom/i, 'Destinations');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.locator('.course-head h1')).toBeVisible();
  expect(tracked.errors).toEqual([]);
});

test('every navigation starts at the top of the page', async ({ page }) => {
  await instrument(page);
  await open(page, '/finder');
  await page.mouse.wheel(0, 3000);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
  await page.locator('.course-row').nth(8).click();
  await expect(page.locator('.course-head h1')).toBeVisible();
  // Must land at the top promptly — not animate there while the new page fades in.
  await expect.poll(() => page.evaluate(() => scrollY), { timeout: 2000 }).toBe(0);
  await waitForMotionToSettle(page);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test('course stepper and arrow keys move between sibling courses', async ({ page }) => {
  await instrument(page);
  await open(page, `/k/${IDS.course}`);
  const first = await page.locator('.course-head h1').textContent();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.course-head h1')).not.toHaveText(first ?? '');
  await waitForMotionToSettle(page);
  expect(await stuckElements(page)).toEqual([]);
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.course-head h1')).toHaveText(first ?? '');
});

test('rapid navigation never leaves a blank or half-rendered page', async ({ page }) => {
  const tracked = await instrument(page);
  await open(page, '/destinations');
  const nav = page.getByRole('navigation', { name: 'Consultation chapters' });
  for (const label of ['Courses', 'Shortlist', 'Destinations', 'Next steps', 'Courses']) {
    await nav.getByText(label).click();
    await page.waitForTimeout(60); // faster than the exit animation
  }
  await settledAt(page, /find the right course/i, 'Courses');
  await expect(page.locator('main')).toHaveCount(1);
  expect(tracked.errors).toEqual([]);
});
