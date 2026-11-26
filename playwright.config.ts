/**
 * End-to-end suite (PLAN M9): the production build served by `vite preview`, exercised the way a
 * consultant uses it — every route, navigation, data loading, animation settling, layout at
 * full-screen and windowed sizes, reduced motion.
 *
 * WebKit is the engine family Tauri uses on macOS/Linux; Chromium matches Windows (WebView2).
 * Run: `npm run e2e` (Chromium) · `npm run e2e:all` (adds WebKit; needs its system deps).
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const fullscreen = { width: 1920, height: 1080 };
const windowed = { width: 1366, height: 768 };

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: 'chromium-fullscreen', use: { ...devices['Desktop Chrome'], viewport: fullscreen } },
    { name: 'chromium-windowed', use: { ...devices['Desktop Chrome'], viewport: windowed } },
    {
      name: 'chromium-reduced-motion',
      use: { ...devices['Desktop Chrome'], viewport: fullscreen, reducedMotion: 'reduce' },
    },
    { name: 'webkit-fullscreen', use: { ...devices['Desktop Safari'], viewport: fullscreen } },
    { name: 'webkit-windowed', use: { ...devices['Desktop Safari'], viewport: windowed } },
  ],
});
