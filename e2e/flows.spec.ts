/**
 * Consultation flows end to end: compare destinations, country tabs and FAQ, shortlist
 * build-compare-reset, theme switch, status popover and the idle privacy reset.
 */
import { expect, test } from '@playwright/test';
import { IDS, instrument, open, stuckElements, waitForMotionToSettle } from './helpers';

test('compare destinations side by side', async ({ page }) => {
  await instrument(page);
  await open(page, '/destinations');
  await page.getByRole('button', { name: 'Compare' }).click();
  const table = page.getByRole('table');
  await expect(table).toBeVisible();
  await expect(table.getByRole('columnheader')).toHaveCount(6);
  await expect(table.getByRole('rowheader', { name: 'Typical tuition / year' })).toBeVisible();
  await waitForMotionToSettle(page);
  expect(await stuckElements(page)).toEqual([]);
});

test('country tabs switch cleanly and FAQ answers open on demand', async ({ page }) => {
  await instrument(page);
  await open(page, `/c/${IDS.country}`);
  await page.getByRole('tab', { name: /why the uk/i }).click();
  await expect(page.locator('.feature').first()).toBeVisible();
  await page.getByRole('tab', { name: /visa & work/i }).click();
  await expect(page.locator('.steps li').first()).toBeVisible();
  const q = page.locator('.faq__q').first();
  await q.click();
  await expect(q).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.faq__a')).toHaveCount(1);
  await waitForMotionToSettle(page);
  expect(await stuckElements(page)).toEqual([]);
});

test('shortlist: add, compare, remove and start a new consultation', async ({ page }) => {
  await instrument(page);
  await open(page, `/k/${IDS.course}`);
  await page.getByRole('button', { name: /add to shortlist/i }).click();
  await expect(page.getByRole('status')).toContainText('Added to shortlist');
  await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: /add to shortlist/i }).click();

  await page
    .getByRole('navigation', { name: 'Consultation chapters' })
    .getByText('Shortlist')
    .click();
  await expect(page.getByRole('heading', { name: 'Your shortlist' })).toBeVisible();
  await expect(page.locator('.compare__course')).toHaveCount(2);

  await page.locator('.compare__course').first().getByRole('button', { name: 'Remove' }).click();
  await expect(page.locator('.compare__course')).toHaveCount(1);

  await page.getByRole('button', { name: /start new consultation/i }).click();
  await expect(page.getByRole('heading', { name: /study abroad with/i })).toBeVisible();
});

test('theme switch keeps the current page and state', async ({ page }) => {
  await instrument(page);
  await open(page, '/finder');
  await page.getByRole('searchbox', { name: 'Search' }).fill('nursing');
  await page.getByRole('button', { name: /switch to light appearance/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('searchbox', { name: 'Search' })).toHaveValue('nursing');
  await page.getByRole('button', { name: /switch to dark appearance/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('status popover shows provenance and closes on Escape', async ({ page }) => {
  await instrument(page);
  await open(page, '/destinations');
  await page.getByRole('button', { name: /course catalogue/i }).click();
  const pop = page.getByRole('dialog', { name: /course catalogue status/i });
  await expect(pop).toContainText('4,225 courses');
  await page.keyboard.press('Escape');
  await expect(pop).toHaveCount(0);
  // Escape closed the popover only — it must not also navigate back.
  await expect(page.getByRole('heading', { name: /where would you like to study/i })).toBeVisible();
});

test('idle reset clears the session after 4 minutes + 20 s', async ({ page }) => {
  await page.clock.install();
  await instrument(page);
  await open(page, `/k/${IDS.course}`);
  await page.getByRole('button', { name: /add to shortlist/i }).click();
  await page.clock.fastForward('04:01');
  await expect(page.getByRole('dialog', { name: /this consultation will reset/i })).toBeVisible();
  await page.clock.runFor('00:21');
  await expect(page.getByRole('heading', { name: /study abroad with/i })).toBeVisible();
  await page.getByRole('button', { name: /start the consultation/i }).click();
  await page
    .getByRole('navigation', { name: 'Consultation chapters' })
    .getByText('Shortlist')
    .click();
  await expect(page.getByText('No courses shortlisted yet')).toBeVisible();
});

test('close button asks before quitting and can be cancelled', async ({ page }) => {
  await instrument(page);
  await open(page, '/destinations');
  await page.getByRole('button', { name: /close the app/i }).click();
  const confirm = page.getByRole('dialog', { name: /close lga study visa explorer/i });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: /keep presenting/i }).click();
  await expect(confirm).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /where would you like to study/i })).toBeVisible();
});
