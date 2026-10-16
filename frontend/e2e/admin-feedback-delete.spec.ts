import { expect, test, type Page, type Route } from '@playwright/test';

// Admin deletes a feedback ticket from its detail screen: confirm dialog, DELETE
// /admin/feedback/{id} -> 204, then back on the list without the deleted ticket.

const API = 'http://localhost:8080/api';

const ADMIN = {
  id: 'admin1',
  email: 'admin@example.com',
  displayName: 'Admin',
  role: 'ADMIN',
  emailVerified: true,
  hasProfilePicture: false,
  households: [],
};

function ticket(id: string, description: string) {
  return {
    id,
    type: 'BUG',
    description,
    status: 'OPEN',
    createdAt: '2026-10-10T09:00:00Z',
    updatedAt: '2026-10-10T09:00:00Z',
    attachments: [],
    userId: 'u1',
    userEmail: 'someone@example.com',
    userDisplayName: `Reporter ${id}`,
  };
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function mockBackend(page: Page, state: { tickets: ReturnType<typeof ticket>[]; deleted: string[] }) {
  await page.route('**/version', (route) => json(route, { version: 'v1' }));
  await page.route(`${API}/auth/login`, (route) =>
    json(route, { accessToken: 'a', refreshToken: 'r', user: ADMIN }),
  );
  await page.route(`${API}/auth/me`, (route) => json(route, ADMIN));
  await page.route(`${API}/admin/feedback`, (route) => json(route, state.tickets));
  await page.route(`${API}/admin/feedback/*`, (route) => {
    const id = route.request().url().split('/').pop()!;
    if (route.request().method() === 'DELETE') {
      state.deleted.push(id);
      state.tickets = state.tickets.filter((t) => t.id !== id);
      return route.fulfill({ status: 204 });
    }
    const found = state.tickets.find((t) => t.id === id);
    return found ? json(route, found) : json(route, { message: 'Not found' }, 404);
  });
}

test('admin can permanently delete a feedback ticket from its detail screen', async ({ page }) => {
  const state = { tickets: [ticket('t1', 'Delete me please'), ticket('t2', 'Keep me around')], deleted: [] as string[] };
  await mockBackend(page, state);

  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(ADMIN.email);
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByText('Log in', { exact: true }).last().click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));

  await page.goto('/admin/feedback/t1');
  await expect(page.getByText('Delete me please')).toBeVisible();

  let dialogMessage = '';
  page.once('dialog', (dialog) => {
    dialogMessage = dialog.message();
    return dialog.accept();
  });
  await page.getByText('Delete ticket', { exact: true }).click();

  await page.waitForURL('**/admin/feedback');
  expect(dialogMessage).toContain('Permanently delete');
  expect(state.deleted).toEqual(['t1']);
  await expect(page.getByText('Keep me around')).toBeVisible();
  await expect(page.getByText('Delete me please')).toHaveCount(0);
});

test('dismissing the confirmation keeps the ticket', async ({ page }) => {
  const state = { tickets: [ticket('t1', 'Delete me please')], deleted: [] as string[] };
  await mockBackend(page, state);

  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(ADMIN.email);
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByText('Log in', { exact: true }).last().click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));

  await page.goto('/admin/feedback/t1');
  await expect(page.getByText('Delete me please')).toBeVisible();

  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByText('Delete ticket', { exact: true }).click();

  await expect(page.getByText('Delete me please')).toBeVisible();
  expect(state.deleted).toEqual([]);
  expect(new URL(page.url()).pathname).toBe('/admin/feedback/t1');
});
