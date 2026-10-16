import { expect, test } from '@playwright/test';

test('login screen renders and matches visual snapshot', async ({ page }) => {
  // The screen pings /version on mount to show connection status; mock it so the
  // screenshot is deterministic instead of depending on a live backend being up.
  await page.route('**/version', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: 'v1' }) }),
  );

  await page.goto('/login');

  // .last(): the collapsed "House Hub" frame's header also renders a hidden shadow copy of
  // its own title to measure natural width for its shrink-to-fit sizing (see
  // components/Module/ModuleTitleBar.tsx) - the real, visible title is the last "House
  // Hub" match in DOM order.
  await expect(page.getByText('House Hub').last()).toBeVisible();
  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await expect(page.getByPlaceholder('Password')).toBeVisible();
  await expect(page.getByText('Connected')).toBeVisible();

  await expect(page).toHaveScreenshot('login.png');
});
