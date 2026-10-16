import { expect, test, type Route } from '@playwright/test';

// Chat bubbles show only the time for messages sent today, and date + time for older
// ones (year only when it's not the current year). Clock, locale and timezone are pinned
// so the expected strings are deterministic.

const API = 'http://localhost:8080/api';

const USER = {
  id: 'u1',
  email: 'chat@example.com',
  displayName: 'Chat User',
  role: 'USER',
  emailVerified: true,
  hasProfilePicture: false,
  households: [
    {
      householdId: 'h1',
      householdName: 'Test House',
      role: 'OWNER',
      memberCount: 2,
      onlineCount: 1,
      isDefault: true,
    },
  ],
};

function message(id: string, text: string, createdAt: string) {
  return { id, householdId: 'h1', senderId: 'u2', senderDisplayName: 'Housemate', text, createdAt };
}

// Backend returns newest-first.
const MESSAGES = [
  message('m3', 'Sent today', '2026-10-16T10:30:00Z'),
  message('m2', 'Sent earlier this year', '2026-10-14T08:05:00Z'),
  message('m1', 'Sent last year', '2025-12-31T21:15:00Z'),
];

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

test.use({ locale: 'en-GB', timezoneId: 'Europe/Brussels' });

test('chat shows the date on messages not sent today', async ({ page }) => {
  await page.route('**/version', (route) => json(route, { version: 'v1' }));
  await page.route(`${API}/auth/login`, (route) => json(route, { accessToken: 'a', refreshToken: 'r', user: USER }));
  await page.route(`${API}/auth/me`, (route) => json(route, USER));
  await page.route(`${API}/households/h1/chat-messages`, (route) => json(route, MESSAGES));

  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(USER.email);
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByText('Log in', { exact: true }).last().click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));

  // Pinned only after login: a frozen clock stalls the login card's open animation.
  await page.clock.setFixedTime(new Date('2026-10-16T15:00:00Z'));
  await page.goto('/house/h1/chat');
  await expect(page.getByText('Sent today')).toBeVisible();

  // Today: time only (12:30 Brussels time).
  await expect(page.getByText('12:30', { exact: true })).toBeVisible();
  // Earlier this year: day + month, no year.
  await expect(page.getByText('14 Oct, 10:05', { exact: true })).toBeVisible();
  // Previous year: year included.
  await expect(page.getByText('31 Dec 2025, 22:15', { exact: true })).toBeVisible();
});
