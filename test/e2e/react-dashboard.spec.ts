import { test, expect } from '@playwright/test';
import { installVendorRoutes } from './helpers/routes';

// Exercises the migrated React dashboard shell in a real browser, served from the built bundle by the
// second fixture server (FIXTURE_UI=react). Requires `npm run build`; skips when the build predates
// the React dashboard entry.

test.describe('React dashboard', () => {
  test('serves the built React dashboard and reaches the ticker from fixture data', async ({ page }, testInfo) => {
    const routes = await installVendorRoutes(page);

    const res = await page.goto('/');
    expect(res?.status()).toBe(200);

    await expect(page.locator('#root')).toBeVisible();
    if ((await page.locator('[data-surface="dashboard"]').count()) === 0) {
      testInfo.skip(true, 'React dashboard entry not present in dashboard/dist — run `npm run build`');
    }

    // The AppShell bar and nav are present from the first paint; the ticker arrives with the data.
    await expect(page.locator('.crucix-app-bar')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.crucix-app-nav')).toBeVisible();
    await expect(page.getByText('Live news')).toBeVisible({ timeout: 10_000 });

    routes.assertAllRouted();
  });
});
