import { expect, test } from '@playwright/test';

test('login screen renders and matches visual snapshot', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByText('House Hub')).toBeVisible();
  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await expect(page.getByPlaceholder('Password')).toBeVisible();

  await expect(page).toHaveScreenshot('login.png');
});
