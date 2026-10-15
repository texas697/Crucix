import { test, expect } from '@playwright/test';
import { installVendorRoutes } from './helpers/routes';

// Exercises the migrated React media surface in a real browser, served from the built bundle by the
// second fixture server (FIXTURE_UI=react). Requires `npm run build`; skips when the build predates
// the React media entry.

test.describe('React media', () => {
  test('serves the built React media page with the channel list', async ({ page }, testInfo) => {
    const routes = await installVendorRoutes(page);

    const res = await page.goto('/media');
    expect(res?.status()).toBe(200);

    await expect(page.locator('#root')).toBeVisible();
    if ((await page.locator('[data-surface="media"]').count()) === 0) {
      testInfo.skip(true, 'React media entry not present in dashboard/dist — run `npm run build`');
    }

    // The channel list renders (buttons/cells with the broadcaster names).
    await expect(page.locator('[data-surface="media"] .crucix-media-channels')).toBeVisible({ timeout: 10_000 });

    routes.assertAllRouted();
  });
});
