import { test, expect } from '@playwright/test';
import { installVendorRoutes } from './helpers/routes';

// Exercises the migrated React digest in a real browser, served from the built bundle by the second
// fixture server (FIXTURE_UI=react). Fails if any third-party request is not routed locally.
//
// Requires `npm run build` (the react-* projects' webServer serves dashboard/dist). When the build is
// missing or predates the React digest, the server falls back to the legacy page and this test skips.

test.describe('React digest', () => {
  test('serves the built React digest and opens the reader from a card', async ({ page }, testInfo) => {
    const routes = await installVendorRoutes(page);

    const res = await page.goto('/digest');
    expect(res?.status()).toBe(200);

    await expect(page.locator('#root')).toBeVisible();
    if ((await page.locator('[data-surface="digest"]').count()) === 0) {
      testInfo.skip(true, 'React digest entry not present in dashboard/dist — run `npm run build`');
    }

    // Cards come from test/fixtures/server.mjs DIGEST_ITEMS.
    const card = page.getByText('Example news piece');
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    routes.assertAllRouted();
  });
});
