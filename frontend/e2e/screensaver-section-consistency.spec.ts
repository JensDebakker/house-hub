import { expect, test, type Page } from '@playwright/test';

// Regression coverage for two reports about the opened Screensaver section specifically
// (house/[householdId]/screensaver/*), both only visible at desktop-ish widths or via a
// specific navigation path - neither reproduced on the dashboard's own, differently-nested
// tile grid or title bar.

const USER = {
  id: 'u1',
  email: 'screensaver-repro@example.com',
  displayName: 'Screensaver Repro User',
  role: 'USER',
  emailVerified: true,
  hasProfilePicture: false,
  households: [
    {
      householdId: 'h1',
      householdName: 'Super House',
      role: 'OWNER',
      memberCount: 2,
      onlineCount: 1,
      isDefault: true,
    },
  ],
};

async function mockBackend(page: Page) {
  await page.route('**/version', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: 'v1' }) }),
  );
  await page.route('**/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accessToken: 'a', refreshToken: 'r', user: USER }),
    }),
  );
  await page.route('**/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(USER) }),
  );
}

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(USER.email);
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByText('Log in', { exact: true }).last().click();
}

/** Walks up from a tile's title text to the TileGrid-assigned per-tile wrapper (the first
 * ancestor whose own parent uses `flexWrap: 'wrap'` - TileGrid's own distinguishing style),
 * returning that wrapper's real rendered width. */
async function tileWrapperWidth(page: Page, title: string): Promise<number | null> {
  return page.evaluate((t) => {
    const els = Array.from(document.querySelectorAll('div')).filter(
      (el) => el.textContent?.trim() === t && el.children.length === 0,
    );
    let el: Element | null = els[els.length - 1] ?? null;
    for (let i = 0; i < 15 && el; i++) {
      if (el.parentElement && getComputedStyle(el.parentElement).flexWrap === 'wrap') {
        return el.getBoundingClientRect().width;
      }
      el = el.parentElement;
    }
    return null;
  }, title);
}

test('tapping the collapsed Screensaver frame from a submodule returns to the section, not an unmatched route', async ({
  page,
}) => {
  await mockBackend(page);
  await login(page);
  await page.waitForURL('**/house/h1/dashboard', { timeout: 15000 });
  await page.getByText('Screensaver').click();
  await page.waitForURL('**/house/h1/screensaver**', { timeout: 15000 });
  await page.getByText('Layout').click();
  await page.waitForURL('**/house/h1/screensaver/layout**', { timeout: 15000 });

  // Tap the collapsed "Screensaver" frame's header to go back up to the section. force:true -
  // the title layer sitting over the header is `pointerEvents: 'none'` in the real app (so
  // taps fall through to the frame underneath), but Playwright's own actionability check
  // doesn't know that and treats it as blocking the click.
  const screensaverHeader = page.getByText('Screensaver', { exact: true }).last();
  await screensaverHeader.click({ force: true });

  await page.waitForURL('**/house/h1/screensaver', { timeout: 15000 });
  await expect(page.getByText('Unmatched Route')).toHaveCount(0);
  await expect(page.getByText('Layout')).toBeVisible();
  await expect(page.getByText('AutoStart')).toBeVisible();
});

test('the Screensaver section\'s tile grid picks the same column count as the dashboard\'s at the same browser width', async ({
  page,
}) => {
  // The Screensaver section's own tile grid sits one collapsed-House-frame deeper than
  // house/[householdId]/dashboard.tsx's (House stays open there; it collapses around
  // Screensaver here) - confirmed via Playwright that without compensating for that extra
  // nesting level's own chrome (TileGrid's extraChromeWidth), the exact same 3-tile content
  // picks a *different* column count than the dashboard's grid at specific browser widths
  // (measured: ~1080-1095px - dashboard at 5 columns, Screensaver still stuck at 3). Chosen
  // here because it's comfortably inside that measured range.
  await page.setViewportSize({ width: 1090, height: 900 });
  await mockBackend(page);
  await login(page);
  await page.waitForURL('**/house/h1/dashboard', { timeout: 15000 });
  await page.waitForTimeout(300);

  const dashboardTileWidth = await tileWrapperWidth(page, 'Screensaver');
  expect(dashboardTileWidth).not.toBeNull();

  await page.getByText('Screensaver').click();
  await page.waitForURL('**/house/h1/screensaver**', { timeout: 15000 });
  await page.waitForTimeout(300);

  const screensaverTileWidth = await tileWrapperWidth(page, 'Layout');
  expect(screensaverTileWidth).not.toBeNull();

  // Not pixel-identical (the extra nesting level's own ~16px of chrome is real and
  // unavoidable without changing the collapsed-frame's own visual design - see
  // COLLAPSED_FRAME_CHROME_WIDTH) - but in the same column-count tier, which is the
  // dramatic, actually-reported difference: a 5-column tile is roughly a fifth of the grid's
  // width, a 3-column tile roughly a third, which differ far more than the residual chrome
  // ever could on their own.
  expect(Math.abs(dashboardTileWidth! - screensaverTileWidth!)).toBeLessThan(20);
});
