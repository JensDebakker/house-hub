import { expect, test, type Page } from '@playwright/test';

// Visual regression coverage for three mobile-responsiveness bugs fixed together (see
// components/Module/ and TileGrid.tsx): a phone-width tile grid wrapping to one column instead of
// two, a title-bar badge/button overlapping its title text, and a long title hard-
// truncating instead of shrinking to fit. Run at a phone-ish width (390px, roughly an
// iPhone) since none of these reproduced at tablet/desktop widths.

const USER = {
  id: 'u1',
  email: 'mobile-repro@example.com',
  displayName: 'Repro User',
  role: 'USER',
  emailVerified: true,
  hasProfilePicture: false,
  households: [
    {
      householdId: 'h1',
      // Long enough that the open card header's title has to actually shrink (not just
      // fit comfortably) to avoid truncating next to the online badge - see bug3.
      householdName: 'Vandenberghe House',
      role: 'OWNER',
      memberCount: 4,
      onlineCount: 3,
      isDefault: true,
    },
    {
      householdId: 'h2',
      householdName: 'Short',
      role: 'MEMBER',
      memberCount: 1,
      onlineCount: 0,
      isDefault: false,
    },
  ],
};

/** Stubs `WebSocket` for this app's own `/ws` endpoint only (any other socket - e.g. the
 * dev server's HMR/live-reload one - is left to the real implementation), so the house
 * card's "N online" presence badge has something to render without a live backend.
 * Records instances on `window.__sockets` so `pushPresence` can push a message later. */
async function stubPresenceSocket(page: Page) {
  await page.addInitScript(() => {
    const RealWebSocket = window.WebSocket;
    class FakeWebSocket {
      static OPEN = 1;
      static CONNECTING = 0;
      static CLOSED = 3;
      readyState = 0;
      onopen: ((ev: unknown) => void) | null = null;
      onmessage: ((ev: unknown) => void) | null = null;
      onclose: ((ev: unknown) => void) | null = null;
      onerror: ((ev: unknown) => void) | null = null;
      constructor(public url: string) {
        (window as unknown as { __sockets: FakeWebSocket[] }).__sockets ??= [];
        (window as unknown as { __sockets: FakeWebSocket[] }).__sockets.push(this);
        setTimeout(() => {
          this.readyState = 1;
          this.onopen?.({});
        }, 0);
      }
      send() {}
      close() {
        this.readyState = 3;
        this.onclose?.({});
      }
    }
    (window as unknown as { WebSocket: unknown }).WebSocket = function (url: string, ...rest: unknown[]) {
      if (typeof url === 'string' && url.includes('/ws?')) return new FakeWebSocket(url);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error - passthrough constructor call to the real WebSocket
      return new RealWebSocket(url, ...rest);
    };
  });
}

async function pushPresence(page: Page, count: number) {
  await page.waitForFunction(() => (window as unknown as { __sockets?: unknown[] }).__sockets?.length);
  await page.evaluate((c: number) => {
    const sockets = (window as unknown as { __sockets: { onmessage: ((ev: { data: string }) => void) | null }[] })
      .__sockets;
    for (const s of sockets) {
      s.onmessage?.({ data: JSON.stringify({ channel: 'presence', payload: { count: c } }) });
    }
  }, count);
}

type Box = { x: number; y: number; width: number; height: number };

/** Whether two boxes overlap by more than a couple of px - a small tolerance for text
 * bounding-box antialiasing fringes (a title's clearance from a corner badge is sized to
 * roughly match the badge's own measured width, not to leave a large visible gap on top of
 * it, so a sub-pixel touch isn't a real, visible overlap the way several whole pixels of
 * actual overlap would be). */
function boxesOverlap(a: Box, b: Box, tolerancePx = 2): boolean {
  const horizontalOverlapPx = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const verticalOverlapPx = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return horizontalOverlapPx > tolerancePx && verticalOverlapPx > tolerancePx;
}

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
  // .last(): the open card's header also renders a hidden shadow copy of its own title
  // ("Log in") to measure natural width (see components/Module/ModuleTitleBar.tsx) - the
  // real, visible submit button is the last "Log in" match in DOM order, after both the
  // shadow copy and the real title.
  await page.getByText('Log in', { exact: true }).last().click();
}

test.describe('mobile title bar / tile grid scaling', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('house dashboard tile grid uses two columns with no title/badge overlap', async ({ page }) => {
    await mockBackend(page);
    await login(page);
    await page.waitForURL('**/house/h1/dashboard');
    // The last() of each pair below is the real, visible/rendered copy - components/Module
    // also renders a hidden (opacity: 0) shadow copy of title/badge content to measure natural
    // size for its shrink-to-fit math (see TitleBarSlot/ModuleTitleBar/tile-mode comments),
    // which getByText would otherwise also match.
    await expect(page.getByText('Screensaver').last()).toBeVisible();
    // Let the one-time card entrance animation (and the shrink-to-fit measurement passes
    // it triggers) finish before asserting on layout.
    await page.waitForTimeout(500);

    // Bug 1: two tiles per row, not one at ~55% width with a blank gap beside it.
    const screensaverBox = await page.getByText('Screensaver').last().boundingBox();
    const filesBox = await page.getByText('Files').last().boundingBox();
    expect(screensaverBox).not.toBeNull();
    expect(filesBox).not.toBeNull();
    // Files sits to the right of Screensaver, same row (roughly equal y).
    expect(Math.abs(screensaverBox!.y - filesBox!.y)).toBeLessThan(5);
    expect(filesBox!.x).toBeGreaterThan(screensaverBox!.x + screensaverBox!.width - 5);

    // Bug 2: a single corner badge ("Start" on Screensaver, "Coming soon" on the disabled
    // tiles) must not overlap its tile's title text.
    const startBox = await page.getByText('Start').boundingBox();
    expect(startBox).not.toBeNull();
    expect(boxesOverlap(screensaverBox!, startBox!)).toBe(false);

    const tasksBox = await page.getByText('Tasks').last().boundingBox();
    const tasksChipBox = await page.getByText('Coming soon').first().boundingBox();
    expect(tasksBox).not.toBeNull();
    expect(tasksChipBox).not.toBeNull();
    expect(boxesOverlap(tasksBox!, tasksChipBox!)).toBe(false);

    await expect(page).toHaveScreenshot('mobile-house-dashboard-tile-grid.png');
  });

  test('open house card title bar shrinks a long title instead of truncating it next to the online badge', async ({
    page,
  }) => {
    await stubPresenceSocket(page);
    await mockBackend(page);
    await login(page);
    await page.waitForURL('**/house/h1/dashboard');
    await pushPresence(page, 3);
    await expect(page.getByText('3 online').last()).toBeVisible();
    await page.waitForTimeout(500);

    // Bug 3: the full household name renders (possibly at a smaller font), not an
    // ellipsis-truncated prefix of it.
    const title = page.getByText('Vandenberghe House', { exact: false }).last();
    await expect(title).toBeVisible();
    expect(await title.textContent()).toBe('Vandenberghe House');

    // Bug 2: the badge and the title must not overlap each other.
    const titleBox = await title.boundingBox();
    const badgeBox = await page.getByText('3 online').last().boundingBox();
    expect(titleBox).not.toBeNull();
    expect(badgeBox).not.toBeNull();
    expect(titleBox!.x).toBeGreaterThanOrEqual(badgeBox!.x + badgeBox!.width);

    await expect(page).toHaveScreenshot('mobile-house-card-title-bar.png');
  });
});
