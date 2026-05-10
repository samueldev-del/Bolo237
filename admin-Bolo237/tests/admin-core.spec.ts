import { expect, test } from '@playwright/test';
import { ADMIN_SESSION_COOKIE_NAME, createAdminSessionToken } from './utils/admin-session';

const NOW = '2025-01-15T08:30:00.000Z';
const CSRF_TOKEN = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

test.describe('Admin core role flow', () => {
  test('shows user management and the job moderation queue for the admin role', async ({ context, page }) => {
    await mockAdminApis(context);

    await context.addCookies([
      {
        name: ADMIN_SESSION_COOKIE_NAME,
        value: createAdminSessionToken(),
        url: 'http://localhost:3110',
        httpOnly: true,
        sameSite: 'Strict',
      },
    ]);

    await page.goto('/utilisateurs/liste');

    await expect(page.getByRole('heading', { name: /Utilisateurs/i })).toBeVisible();
    await expect(page.getByText('Candidate Alpha')).toBeVisible();
    await expect(page.getByText('Bolo Industrie')).toBeVisible();
    await expect(page.getByText('Atelier Mboa')).toBeVisible();

    await page.getByPlaceholder(/Rechercher par ID, nom, email ou telephone/i).fill('Atelier');
    await page.getByRole('button', { name: /Rechercher/i }).click();

    await expect(page.getByText('Atelier Mboa')).toBeVisible();
    await expect(page.getByText('Candidate Alpha')).toBeHidden();

    await page.goto('/moderation/jobs');

    await expect(page.getByRole('heading', { name: /Moderation des annonces/i })).toBeVisible();
    const pendingRow = page
      .getByText('Annonce plombier urgence', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"flex items-center justify-between")][1]');
    await expect(pendingRow).toBeVisible();

    await pendingRow.getByTitle(/Approuver/i).click();

    await expect(page.getByText(/Annonce approuvee/i)).toBeVisible();
    await expect(pendingRow.getByText('Approuve', { exact: true })).toBeVisible();
  });
});

async function mockAdminApis(context: Parameters<typeof test>[0]['context']) {
  const users = [
    {
      id: 1,
      email: 'candidate.alpha@example.com',
      name: 'Candidate Alpha',
      role: 'CANDIDAT',
      isVerified: true,
      isBanned: false,
      banReason: null,
      bannedAt: null,
      createdAt: NOW,
    },
    {
      id: 2,
      email: 'enterprise.e2e@example.com',
      name: 'Bolo Industrie',
      role: 'ENTREPRISE',
      isVerified: true,
      isBanned: false,
      banReason: null,
      bannedAt: null,
      createdAt: NOW,
    },
    {
      id: 3,
      email: 'artisan.e2e@example.com',
      name: 'Atelier Mboa',
      role: 'ARTISAN',
      isVerified: true,
      isBanned: false,
      banReason: null,
      bannedAt: null,
      createdAt: NOW,
    },
  ];

  const jobs = [
    {
      id: 301,
      title: 'Annonce plombier urgence',
      company: 'Atelier Mboa',
      location: 'Douala',
      description: 'Besoin d un plombier pour intervention immediate.',
      salary: null,
      status: 'PENDING',
      authorId: 3,
      createdAt: NOW,
      author: { id: 3, name: 'Atelier Mboa', email: 'artisan.e2e@example.com' },
    },
    {
      id: 302,
      title: 'Comptable junior',
      company: 'Bolo Industrie',
      location: 'Yaounde',
      description: 'Support comptable.',
      salary: '250000',
      status: 'APPROVED',
      authorId: 2,
      createdAt: NOW,
      author: { id: 2, name: 'Bolo Industrie', email: 'enterprise.e2e@example.com' },
    },
  ];

  await context.route(/\/api\/backend\/csrf-token(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken: CSRF_TOKEN }),
    });
  });

  await context.route(/\/api\/backend\/admin\/me\/notifications(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [],
        unreadCount: 0,
        pagination: { page: 1, limit: 1, total: 0, totalPages: 1 },
      }),
    });
  });

  await context.route(/\/api\/backend\/admin\/emails\/summary(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        summary: {
          totalCount: 0,
          unreadCount: 0,
          repliedCount: 0,
          readCount: 0,
          lastMessageAt: null,
        },
        sync: {
          enabled: true,
          mailbox: 'support@bolo237.com',
          syncing: false,
          lastSyncedAt: NOW,
          lastError: null,
          lastErrorAt: null,
          totalInMailbox: 0,
          unreadInMailbox: 0,
        },
      }),
    });
  });

  await context.route(/\/api\/backend\/users(?:\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const search = (url.searchParams.get('search') || '').toLowerCase();
    const role = (url.searchParams.get('role') || '').toUpperCase();

    const filteredUsers = users.filter((user) => {
      const matchesSearch =
        !search || `${user.name || ''} ${user.email} ${user.role}`.toLowerCase().includes(search);
      const matchesRole = !role || user.role === role;
      return matchesSearch && matchesRole;
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        users: filteredUsers,
        pagination: { page: 1, limit: 15, total: filteredUsers.length, totalPages: 1 },
      }),
    });
  });

  await context.route(/\/api\/backend\/admin\/jobs(?:\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const search = (url.searchParams.get('search') || '').toLowerCase();
    const status = (url.searchParams.get('status') || '').toUpperCase();

    const filteredJobs = jobs.filter((job) => {
      const matchesSearch =
        !search || `${job.title} ${job.company} ${job.description}`.toLowerCase().includes(search);
      const matchesStatus = !status || status === 'ALL' || job.status === status;
      return matchesSearch && matchesStatus;
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobs: filteredJobs,
        pagination: { page: 1, limit: 10, total: filteredJobs.length, totalPages: 1 },
      }),
    });
  });

  await context.route(/\/api\/backend\/admin\/jobs\/301\/status$/, async (route) => {
    const payload = route.request().postDataJSON() as { status?: string };
    const job = jobs.find((entry) => entry.id === 301);
    if (job && payload.status) {
      job.status = payload.status;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, job }),
    });
  });
}