import { expect, test, type Page, type Route } from '@playwright/test';

// Covers editing your own feedback ticket on /feedback: edit controls only while OPEN,
// saving type/description via PATCH, removing an attachment (with a confirm), and a 409
// (ticket no longer OPEN) surfacing as a readable message. The backend is fully mocked.

const API = 'http://localhost:8080/api';

const USER = {
  id: 'u1',
  email: 'feedback@example.com',
  displayName: 'Feedback User',
  role: 'USER',
  emailVerified: true,
  hasProfilePicture: false,
  households: [],
};

// 1x1 opaque blue PNG (stretched to the thumbnail size), so the authed attachment
// thumbnail visibly renders in the screenshot. Relative to the cwd, i.e. frontend/.
const ATTACHMENT_PNG = 'e2e/fixtures/attachment.png';

type Ticket = {
  id: string;
  type: 'BUG' | 'SUGGESTION';
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  attachments: { id: string; contentType: string; originalFilename: string }[];
};

function openTicket(): Ticket {
  return {
    id: 't1',
    type: 'BUG',
    description: 'The button is broken',
    status: 'OPEN',
    createdAt: '2026-10-10T09:00:00Z',
    updatedAt: '2026-10-10T09:00:00Z',
    attachments: [{ id: 'a1', contentType: 'image/png', originalFilename: 'screenshot.png' }],
  };
}

const RESOLVED_TICKET: Ticket = {
  id: 't2',
  type: 'SUGGESTION',
  description: 'Add dark mode',
  status: 'RESOLVED',
  createdAt: '2026-10-01T09:00:00Z',
  updatedAt: '2026-10-02T09:00:00Z',
  attachments: [],
};

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function mockBackend(page: Page, state: { ticket: Ticket; patchStatus?: number }) {
  await page.route('**/version', (route) => json(route, { version: 'v1' }));
  await page.route(`${API}/auth/login`, (route) =>
    json(route, { accessToken: 'a', refreshToken: 'r', user: USER }),
  );
  await page.route(`${API}/auth/me`, (route) => json(route, USER));
  await page.route(`${API}/feedback`, (route) => json(route, [state.ticket, RESOLVED_TICKET]));
  await page.route(`${API}/feedback/t1`, async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    if (state.patchStatus && state.patchStatus !== 200) {
      return json(route, { message: 'Conflict' }, state.patchStatus);
    }
    const body = route.request().postDataJSON() as Partial<Ticket>;
    state.ticket = { ...state.ticket, ...body, updatedAt: '2026-10-11T09:00:00Z' };
    return json(route, state.ticket);
  });
  await page.route(`${API}/feedback/t1/attachments/a1`, (route) => {
    if (route.request().method() === 'DELETE') {
      state.ticket = { ...state.ticket, attachments: [] };
      return json(route, state.ticket);
    }
    return route.fulfill({ status: 200, contentType: 'image/png', path: ATTACHMENT_PNG });
  });
}

async function loginAndOpenFeedback(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(USER.email);
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByText('Log in', { exact: true }).last().click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
  await page.goto('/feedback');
  await expect(page.getByText('The button is broken')).toBeVisible();
}

test.describe('feedback ticket editing', () => {
  // Pinned so the "Submitted <date>" text in the screenshot doesn't depend on the machine.
  // Taller than the default 720px so the ticket card ends well above the bottom-left
  // corner, where Expo's dev-tools button intermittently overlays the page.
  test.use({ locale: 'en-US', timezoneId: 'Europe/Brussels', viewport: { width: 1280, height: 1000 } });

  test('edit controls only on OPEN tickets; save updates the row', async ({ page }) => {
    const state = { ticket: openTicket() };
    await mockBackend(page, state);
    await loginAndOpenFeedback(page);

    // Only the OPEN ticket gets an Edit button, not the RESOLVED one.
    await expect(page.getByText('Edit', { exact: true })).toHaveCount(1);

    await page.getByText('Edit', { exact: true }).click();
    const description = page.locator('textarea').last();
    await expect(description).toHaveValue('The button is broken');
    await expect(page.getByLabel('Remove screenshot.png')).toBeVisible();
    await expect(page.getByText('Add image (1/5)')).toBeVisible();
    await page.waitForTimeout(300);
    // Just the ticket card, not the whole page - keeps the baseline independent of the
    // create form above it and of the Expo dev-tools button that sometimes overlays the page.
    await expect(page.getByTestId('feedback-ticket-t1')).toHaveScreenshot('feedback-ticket-edit-mode.png');

    await description.fill('The save button is broken on web');
    await page.getByText('Save', { exact: true }).click();

    await expect(page.getByText('The save button is broken on web')).toBeVisible();
    await expect(page.getByText('Edit', { exact: true })).toBeVisible();
    expect(state.ticket.description).toBe('The save button is broken on web');
  });

  test('removing an attachment asks for confirmation then updates the ticket', async ({ page }) => {
    const state = { ticket: openTicket() };
    await mockBackend(page, state);
    await loginAndOpenFeedback(page);

    await page.getByText('Edit', { exact: true }).click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByLabel('Remove screenshot.png').click();

    await expect(page.getByLabel('Remove screenshot.png')).toHaveCount(0);
    await expect(page.getByText('Add image (0/5)')).toBeVisible();
  });

  test('a 409 (ticket no longer open) shows a readable message', async ({ page }) => {
    const state = { ticket: openTicket(), patchStatus: 409 };
    await mockBackend(page, state);
    await loginAndOpenFeedback(page);

    await page.getByText('Edit', { exact: true }).click();
    await page.locator('textarea').last().fill('Changed');
    await page.getByText('Save', { exact: true }).click();

    await expect(page.getByText(/no longer open/)).toBeVisible();
  });
});
