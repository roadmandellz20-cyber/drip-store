const { test, expect, devices } = require('@playwright/test');

test.use({ ...devices['iPhone 13'] });

test('mobile spot check', async ({ page }) => {
  await page.goto('https://mugendistrict.com');
  // ensure at least one product image is visible
  const img = page.locator('img').first();
  await expect(img).toBeVisible();

  // whatsapp link should be present and correct
  const wa = page.locator('a[href*="wa.me"]');
  await expect(wa).toHaveCount(1);
  const href = await wa.getAttribute('href');
  expect(href).toContain('wa.me/2203340558');

  // open first product and ensure CTA present
  await page.click('a[href^="/product"]');
  await expect(page.locator('button')).toBeVisible();
});
