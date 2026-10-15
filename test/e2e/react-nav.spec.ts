import { test, expect } from '@playwright/test';
import { installVendorRoutes } from './helpers/routes';

// Client-side navigation across the three React surfaces: one document, one AppShell, no reload.
// Served from the built bundle by the second fixture server (FIXTURE_UI=react); requires `npm run build`.

declare global {
  interface Window { __navProbe?: number }
}

test.describe('React navigation', () => {
  test('switches tabs without a document reload and returns with browser back', async ({ page }, testInfo) => {
    const routes = await installVendorRoutes(page);

    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    await expect(page.locator('#root')).toBeVisible();
    if ((await page.locator('[data-surface="dashboard"]').count()) === 0) {
      testInfo.skip(true, 'React app entry not present in dashboard/dist — run `npm run build`');
    }

    const bar = page.locator('.crucix-app-bar');
    await expect(bar).toBeVisible();
    await page.evaluate(() => { window.__navProbe = 1; });

    await page.getByRole('tab', { name: 'Readers Digest' }).click();
    await expect(page).toHaveURL(/\/digest$/);
    await expect(page.locator('.crucix-app-surface[data-surface="digest"]')).toBeVisible();
    expect(await page.evaluate(() => window.__navProbe)).toBe(1);
    await expect(bar).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Readers Digest' })).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('tab', { name: 'Live media' }).click();
    await expect(page).toHaveURL(/\/media(\/[\w-]+)?$/);
    await expect(page.locator('.crucix-app-surface[data-surface="media"]')).toBeVisible();
    expect(await page.evaluate(() => window.__navProbe)).toBe(1);
    await expect(bar).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Live media' })).toHaveAttribute('aria-selected', 'true');

    await page.goBack();
    await expect(page).toHaveURL(/\/digest$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.crucix-app-surface[data-surface="dashboard"]')).toBeVisible();
    expect(await page.evaluate(() => window.__navProbe)).toBe(1);
    await expect(page.getByRole('tab', { name: 'Dashboard' })).toHaveAttribute('aria-selected', 'true');

    routes.assertAllRouted();
  });
});
