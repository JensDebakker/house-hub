import { expect, test } from '@playwright/test';

test('login screen renders and matches visual snapshot', async ({ page }) => {
  // The screen pings /version on mount to show connection status; mock it so the
  // screenshot is deterministic instead of depending on a live backend being up.
  await page.route('**/version', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: 'v1' }) }),
  );

  await page.goto('/login');

  await expect(page.getByText('House Hub')).toBeVisible();
  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await expect(page.getByPlaceholder('Password')).toBeVisible();
  await expect(page.getByText('Connected')).toBeVisible();

  await expect(page).toHaveScreenshot('login.png');
});
