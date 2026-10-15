import { test, expect } from '@playwright/test';
import { installVendorRoutes } from './helpers/routes';

// P0 baseline. Captures the current legacy behavior against the loopback fixture server. These are
// the scenarios P3+ will re-run against the React surfaces, so keep them behavioral, not incidental.

test.describe('legacy dashboard', () => {
  test('@smoke renders from fixture data and makes no unrouted third-party request', async ({ page }) => {
    const routes = await installVendorRoutes(page);
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));

    const res = await page.goto('/');
    expect(res?.status()).toBe(200);

    await expect(page.locator('#map')).toBeVisible();
    await expect(page.locator('nav.mainnav')).toBeVisible({ timeout: 15_000 });

    routes.assertAllRouted();
    expect(errors, `page errors:\n${errors.join('\n')}`).toEqual([]);
  });
});

test.describe('legacy digest', () => {
  test('@smoke renders the digest shell', async ({ page }) => {
    const routes = await installVendorRoutes(page);
    const res = await page.goto('/digest');
    expect(res?.status()).toBe(200);
    await expect(page.locator('nav.mainnav')).toBeVisible({ timeout: 15_000 });
    routes.assertAllRouted();
  });
});

test.describe('legacy media', () => {
  test('@smoke renders the media shell', async ({ page }) => {
    const routes = await installVendorRoutes(page);
    const res = await page.goto('/media');
    expect(res?.status()).toBe(200);
    await expect(page.locator('nav.mainnav')).toBeVisible({ timeout: 15_000 });
    routes.assertAllRouted();
  });
});

test.describe('baseline metrics', () => {
  test('records initial transfer and usable time', async ({ page }, testInfo) => {
    const routes = await installVendorRoutes(page);
    const start = Date.now();
    await page.goto('/');
    await expect(page.locator('nav.mainnav')).toBeVisible({ timeout: 15_000 });
    const usableMs = Date.now() - start;

    const transfer = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return {
        count: entries.length,
        transferBytes: entries.reduce((n, e) => n + (e.transferSize || 0), 0),
      };
    });

    testInfo.attach('baseline-metrics.json', {
      body: JSON.stringify({ usableMs, ...transfer }, null, 2),
      contentType: 'application/json',
    });
    routes.assertAllRouted();
    expect(usableMs).toBeGreaterThan(0);
  });
});
