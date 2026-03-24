const { test, expect } = require('@playwright/test');

test('can add item to shopping list', async ({ page }) => {
  await page.goto('/');

  await page.fill('input', 'milk');
  await page.click('button');

  await expect(page.locator('text=milk')).toBeVisible();
});
