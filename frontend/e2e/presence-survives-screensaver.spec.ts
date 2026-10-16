import { expect, test, type Page } from '@playwright/test';

// Regression coverage for a reported bug: after launching the real screensaver kiosk display
// (screensaver/[householdId]/start, a top-level route outside the house/[householdId] tree)
// and then exiting it (tap to dismiss), the house card's "N online" presence badge came back
// blank. Root cause: WebSocketContext deliberately keeps the same socket connection open
// across that exact navigation (see its own HOUSEHOLD_ROUTE_GROUPS comment - the kiosk still
// needs 'version'/'presence' live), so the backend never saw a fresh connect to re-broadcast
// presence from. The presence count itself used to live in a `useState` local to
// house/[householdId]/_layout.tsx, which *does* unmount across that same navigation - so it
// came back stuck at its initial `null` forever, with no new message ever going to arrive to
// fill it in. Fixed by moving the count into WebSocketContext itself, which actually persists
// through this - see useOnlinePresence's own comment.

const USER = {
  id: 'u1',
  email: 'presence-repro@example.com',
  displayName: 'Presence Repro User',
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

/** Stubs `WebSocket` for this app's own `/ws` endpoint only, recording every instance on
 * `window.__sockets` (so `pushPresence` can push to all of them) and counting how many were
 * ever constructed on `window.__socketCount` - the real bug here was never about the *count*
 * being wrong, it was about whether a fresh connection ever happened at all across the kiosk
 * round trip, so that count is the key signal a test needs. */
async function stubPresenceSocket(page: Page) {
  await page.addInitScript(() => {
    const RealWebSocket = window.WebSocket;
    class FakeWebSocket {
      static OPEN = 1;
      static CONNECTING = 0;
      static CLOSED = 3;
      readyState = 0;
      url: string;
      onopen: ((ev: unknown) => void) | null = null;
      onmessage: ((ev: unknown) => void) | null = null;
      onclose: ((ev: unknown) => void) | null = null;
      onerror: ((ev: unknown) => void) | null = null;
      constructor(url: string) {
        this.url = url;
        (window as unknown as { __sockets: FakeWebSocket[] }).__sockets ??= [];
        (window as unknown as { __sockets: FakeWebSocket[] }).__sockets.push(this);
        (window as unknown as { __socketCount: number }).__socketCount =
          ((window as unknown as { __socketCount: number }).__socketCount ?? 0) + 1;
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

test('the online-presence badge survives a round trip through the real screensaver kiosk', async ({ page }) => {
  await stubPresenceSocket(page);
  await mockBackend(page);
  await login(page);
  await page.waitForURL('**/house/h1/dashboard', { timeout: 15000 });
  await pushPresence(page, 3);
  await expect(page.getByText('3 online').last()).toBeVisible();

  const socketCountAfterLogin = await page.evaluate(() => (window as unknown as { __socketCount: number }).__socketCount);

  // Open the Screensaver section, then launch the real kiosk display (not the module tile -
  // the actual fullscreen route the bug report called out).
  await page.getByText('Screensaver').click();
  await page.waitForURL('**/house/h1/screensaver**', { timeout: 15000 });
  await page.getByText('Launch kiosk display').click();
  await page.waitForURL('**/screensaver/h1/start**', { timeout: 15000 });

  const socketCountInKiosk = await page.evaluate(() => (window as unknown as { __socketCount: number }).__socketCount);
  // The whole point of HOUSEHOLD_ROUTE_GROUPS including "screensaver" is that this doesn't
  // reconnect - confirm that's actually true, since a reconnect here would hide the bug (a
  // fresh connect/disconnect is exactly what would re-trigger the backend's own presence
  // broadcast, papering over a regression in the "stays open" behavior itself).
  expect(socketCountInKiosk).toBe(socketCountAfterLogin);

  // Exit (tap anywhere to dismiss) without ever pushing a new presence message - the real
  // backend wouldn't either, since (per the assertion above) no new connection happened for
  // it to react to.
  await page.mouse.click(195, 400);
  await page.waitForURL('**/house/h1/screensaver**', { timeout: 15000 });

  // Still the same single connection, and the badge is back with its last-known count - not
  // stuck at blank/null waiting for a message that was never going to come.
  const socketCountAfterReturn = await page.evaluate(() => (window as unknown as { __socketCount: number }).__socketCount);
  expect(socketCountAfterReturn).toBe(socketCountAfterLogin);
  await expect(page.getByText('3 online').last()).toBeVisible();
});
