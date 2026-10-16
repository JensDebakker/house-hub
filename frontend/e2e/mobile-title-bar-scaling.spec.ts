import { expect, test, type Page } from '@playwright/test';

// Visual regression coverage for mobile-responsiveness bugs in components/Module/ and
// TileGrid.tsx: a phone-width tile grid wrapping to one column instead of two, and a
// title-bar badge/button overlapping its title text. Run at a phone-ish width (390px,
// roughly an iPhone) since none of these reproduced at tablet/desktop widths.
//
// Tile-mode badges (a tile's own corner badge/action, e.g. "Coming soon" or Screensaver's
// "Start") render in a plain row below the title now, not shrink-to-fit text measured
// against an absolutely-positioned corner - that whole measurement scheme caused continuous
// visible flicker on a real device (each width-driven state update could nudge a real
// device's sub-pixel layout rounding by a hair, retriggering another measurement,
// indefinitely) despite working in every desktop/Playwright test, so it was removed outright
// for tiles rather than patched further. The open/collapsed card header's own title bar
// (ModuleTitleBar.tsx, tested below) still does shrink a long title to fit next to a badge -
// that one hasn't been reported as flickering and is a different, already-open-card context,
// not a not-yet-opened tile.

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

  test('house dashboard tile grid uses two columns, with each tile\'s badge below its title', async ({ page }) => {
    await mockBackend(page);
    await login(page);
    await page.waitForURL('**/house/h1/dashboard');
    // Tile titles/badges render just once each - no hidden shadow-measurement copy to
    // disambiguate (see ModuleTile.tsx: tiles no longer measure anything to avoid overlap,
    // a badge row below the title makes overlap structurally impossible instead).
    await expect(page.getByText('Screensaver')).toBeVisible();
    await page.waitForTimeout(500);

    // Two tiles per row, not one at ~55% width with a blank gap beside it.
    const screensaverBox = await page.getByText('Screensaver').boundingBox();
    const filesBox = await page.getByText('Files').boundingBox();
    expect(screensaverBox).not.toBeNull();
    expect(filesBox).not.toBeNull();
    // Files sits to the right of Screensaver, same row (roughly equal y).
    expect(Math.abs(screensaverBox!.y - filesBox!.y)).toBeLessThan(5);
    expect(filesBox!.x).toBeGreaterThan(screensaverBox!.x + screensaverBox!.width - 5);

    // A tile's badge ("Start" on Screensaver, "Coming soon" on the disabled tiles) sits in
    // its own row below the title, not overlapping it, and strictly below it vertically.
    const startBox = await page.getByText('Start').boundingBox();
    expect(startBox).not.toBeNull();
    expect(boxesOverlap(screensaverBox!, startBox!)).toBe(false);
    expect(startBox!.y).toBeGreaterThanOrEqual(screensaverBox!.y + screensaverBox!.height - 2);

    const tasksBox = await page.getByText('Tasks').boundingBox();
    const tasksChipBox = await page.getByText('Coming soon').first().boundingBox();
    expect(tasksBox).not.toBeNull();
    expect(tasksChipBox).not.toBeNull();
    expect(boxesOverlap(tasksBox!, tasksChipBox!)).toBe(false);
    expect(tasksChipBox!.y).toBeGreaterThanOrEqual(tasksBox!.y + tasksBox!.height - 2);

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

  test('a disabled tile\'s "Coming soon" badge renders in full below the title, on a single line, never overlapping it', async ({
    page,
  }) => {
    await mockBackend(page);
    await login(page);
    await page.waitForURL('**/house/h1/dashboard');
    await expect(page.getByText('Shopping')).toBeVisible();
    await page.waitForTimeout(500);

    // "Coming soon" used to hard-clip via CSS text-overflow: ellipsis once its old
    // absolutely-positioned corner badge hit a 45%-of-tile-width cap. It's now a plain,
    // fixed-size Text in a normal-flow row below the title (see ModuleTile.tsx) - nothing
    // constrains its width anymore, so this is really just confirming the DOM text is intact
    // and its box isn't CSS-truncating (scrollWidth > clientWidth would mean it still is).
    const title = page.getByText('Shopping');
    const badge = page.getByText('Coming soon').first();
    await expect(title).toHaveText('Shopping');
    await expect(badge).toHaveText('Coming soon');

    const overflow = await badge.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1); // allow sub-px rounding only

    // The title itself renders on one line - it's a single short word, fixed font size, no
    // reason to wrap.
    const titleBox = await title.boundingBox();
    const titleLines = await title.evaluate((el) => {
      const singleLineHeight = parseFloat(getComputedStyle(el).fontSize) * 1.6;
      return Math.round(el.getBoundingClientRect().height / singleLineHeight);
    });
    expect(titleLines).toBe(1);

    // And the badge, in its own row below the title, structurally can't overlap it - confirm
    // that's actually true on screen, not just in theory.
    const badgeBox = await badge.boundingBox();
    expect(titleBox).not.toBeNull();
    expect(badgeBox).not.toBeNull();
    expect(boxesOverlap(titleBox!, badgeBox!)).toBe(false);
    expect(badgeBox!.y).toBeGreaterThanOrEqual(titleBox!.y + titleBox!.height - 2);
  });

  test('opened Screensaver section uses the same two-column tile grid and keeps a Start action in its header', async ({
    page,
  }) => {
    await mockBackend(page);
    await login(page);
    await page.waitForURL('**/house/h1/dashboard');
    await page.getByText('Screensaver').click();
    await page.waitForURL('**/house/h1/screensaver**');
    await page.waitForTimeout(500);

    // Three "Start" text matches exist on this screen, not two: the grid's own "Start" tile
    // (its *title*, not a badge - fontSize 17, the tile title font) happens to literally be
    // the word "Start" too, plus the header's action chip (fontSize 11) which itself renders
    // a hidden shadow-measurement copy alongside its real visible one (see TitleBarSlot) -
    // so picking by DOM order (.first()/.last()) doesn't reliably land on the right one.
    // Font size (17 for the tile title, 11 for the header chip) unambiguously does.
    const starts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('div'))
        .filter((el) => el.textContent?.trim() === 'Start' && el.children.length === 0)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height, fontSize: parseFloat(getComputedStyle(el).fontSize) };
        });
    });
    const startTileBox = starts.find((s) => s.fontSize === 17);
    // Of the two fontSize-11 (header chip) matches, the real visible one is the one that
    // isn't flush against x=0-ish (the hidden shadow copy, an absolutely-positioned sibling
    // with no explicit left offset, ends up positioned by the row's own flow rather than
    // where the real chip visually sits).
    const headerStartCandidates = starts.filter((s) => s.fontSize === 11);
    const headerStartBox = headerStartCandidates.reduce((a, b) => (b.x > a.x ? b : a));
    const layoutBox = await page.getByText('Layout').boundingBox();
    const autoStartBox = await page.getByText('AutoStart').boundingBox();
    expect(startTileBox).toBeTruthy();
    expect(headerStartCandidates.length).toBe(2);
    expect(layoutBox).not.toBeNull();
    expect(autoStartBox).not.toBeNull();

    // Was a hand-rolled `flexBasis: '31%'` row (always ~3 per row, regardless of screen
    // width) instead of the shared TileGrid every other tile grid in the app uses - on a
    // phone-width screen that's inconsistent with the rest of the app's 2-column layout.
    // "Start" and "Layout" should now sit side by side (TileGrid's own 2-column breakpoint),
    // with "AutoStart" wrapping to its own row underneath rather than squeezing a third tile
    // into the first row.
    expect(Math.abs(startTileBox!.y - layoutBox!.y)).toBeLessThan(5);
    expect(autoStartBox!.y).toBeGreaterThan(startTileBox!.y + startTileBox!.h - 5);

    // The card header's own "Start" shortcut (distinct from the "Start" tile in the grid
    // above - same destination, but available without scrolling/looking for the tile) used
    // to be entirely absent once a user had actually opened into the Screensaver section
    // (this card's Module never passed titleBarActions at all) - it's expected top-right,
    // next to the "Screensaver" title.
    const title = page.getByText('Screensaver', { exact: true }).last();
    await expect(title).toBeVisible();
    const titleBox2 = await title.boundingBox();
    expect(titleBox2).not.toBeNull();
    // Top-right of the header: right of the title, same row (roughly equal y).
    expect(headerStartBox.x).toBeGreaterThan(titleBox2!.x + titleBox2!.width - 5);
    expect(Math.abs(headerStartBox.y - titleBox2!.y)).toBeLessThan(20);
  });
});
