import { test, expect } from '@playwright/test';

test('playwright hoạt động', async ({ page }) => {
  await page.setContent('<h1>Smart Campus</h1>');
  await expect(page.locator('h1')).toHaveText('Smart Campus');
});