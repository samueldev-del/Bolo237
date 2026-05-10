import { expect, test } from '@playwright/test';

const CSRF_TOKEN = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const NOW = '2025-01-15T08:30:00.000Z';

const enterpriseUser = {
  id: 77,
  email: 'enterprise.e2e@example.com',
  name: 'Bolo Industrie',
  company: 'Bolo Industrie',
  companyName: 'Bolo Industrie',
  role: 'ENTREPRISE',
  isVerified: true,
  logoUrl: '',
  createdAt: NOW,
};

test.describe('Enterprise role flow', () => {
  test('signs in, opens the recruiter dashboard, and publishes an approved listing visible in My Listings', async ({ page }) => {
    const createRequests: Array<Record<string, unknown>> = [];
    await mockEnterpriseApis(page, createRequests);

    await page.goto('/connexion');
    await dismissCookieBanner(page);

    await primeFrontendSession(page, enterpriseUser);
    await page.getByPlaceholder(/name@example.com or \+2376|nom@example.com ou \+2376/i).fill(enterpriseUser.email);
    await page.getByPlaceholder('••••••••').fill('Test1234!');
    await page.getByRole('button', { name: /Sign in|Se connecter/i }).click();

    await expect(
      page.getByRole('button', { name: /Post a Job|Publier une offre/i }).first(),
    ).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Post a Job|Publier une offre/i }).first().click();
    await expect(page.getByRole('heading', { name: /Post a Job|Publier une offre/i })).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'company-logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6N2V0AAAAASUVORK5CYII=',
        'base64',
      ),
    });
    await expect(page.getByText('company-logo.png')).toBeVisible();

    for (let index = 1; index <= 4; index += 1) {
      const title = index === 4 ? 'Lead QA Operations Cameroun' : `Publication test entreprise ${index}`;

      await publishEnterpriseJob(page, {
        title,
        location: 'Douala, Cameroun',
        description: `Mission ${index}: piloter les operations de recrutement et la qualite des annonces.`,
      });

      if (index < 4) {
        await expect(
          page.getByText(/Published in moderation queue|Publication placee en quarantaine/i),
        ).toBeVisible();
      } else {
        await expect(
          page.getByText(/Publication accepted and online|Publication acceptee et mise en ligne/i),
        ).toBeVisible();
      }
    }

    expect(createRequests).toHaveLength(4);
    expect(createRequests[3]).toMatchObject({
      title: 'Lead QA Operations Cameroun',
      company: 'Bolo Industrie',
      location: 'Douala, Cameroun',
    });

    await page.getByRole('button', { name: /My Listings|Mes annonces/i }).click();

    const listingRow = page.locator('div').filter({ hasText: 'Lead QA Operations Cameroun' }).first();
    await expect(listingRow).toBeVisible();
    await expect(listingRow.getByText(/Approved|Approuvee|Approuvée/i)).toBeVisible();
  });
});

async function mockEnterpriseApis(
  page: Parameters<typeof test>[0]['page'],
  createRequests: Array<Record<string, unknown>>,
) {
  let nextJobId = 900;

  await page.route(/\/api\/backend\/csrf-token(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken: CSRF_TOKEN }),
    });
  });

  await page.route(/\/api\/backend\/auth\/login$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(enterpriseUser),
    });
  });

  await page.route(/\/api\/backend\/auth\/me$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...enterpriseUser,
        phone: '+237699770077',
      }),
    });
  });

  await page.route(/\/api\/backend\/verifications\/status(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'approved' }),
    });
  });

  await page.route(/\/api\/backend\/users\/77\/notifications(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], unreadCount: 0 }),
    });
  });

  await page.route(/\/api\/backend\/dashboard-entreprise\/overview(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ jobs: [] }),
    });
  });

  await page.route(/\/api\/backend\/upload(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        url: '/logo.svg',
        publicId: 'company-logo-1',
      }),
    });
  });

  await page.route(/\/api\/backend\/jobs$/, async (route) => {
    const method = route.request().method();
    if (method !== 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ jobs: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 1 } }),
      });
      return;
    }

    const payload = route.request().postDataJSON() as Record<string, unknown>;
    createRequests.push(payload);

    const createdJob = {
      id: nextJobId,
      title: String(payload.title || ''),
      company: String(payload.company || enterpriseUser.name),
      location: String(payload.location || 'Douala, Cameroun'),
      description: String(payload.description || ''),
      salary: String(payload.salary || ''),
      status: 'ACTIVE',
      authorId: enterpriseUser.id,
      createdAt: NOW,
      author: {
        id: enterpriseUser.id,
        name: enterpriseUser.name,
        email: enterpriseUser.email,
        role: enterpriseUser.role,
        isVerified: true,
        photoUrl: enterpriseUser.logoUrl,
      },
    };
    nextJobId += 1;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ job: createdJob }),
    });
  });
}

async function publishEnterpriseJob(
  page: Parameters<typeof test>[0]['page'],
  job: { title: string; location: string; description: string },
) {
  const continueToDetails = page.getByRole('button', {
    name: /Continue to Job Details|Continuer vers les details/i,
  });
  await expect(continueToDetails).toBeEnabled();
  await continueToDetails.click();

  await page.locator('input[placeholder*="Senior Accountant"], input[placeholder*="Comptable Senior"]').fill(job.title);
  await page.locator('input[placeholder*="Douala, Cameroon"], input[placeholder*="Douala, Cameroun"]').fill(job.location);
  await page.locator('textarea[placeholder*="Describe the responsibilities"], textarea[placeholder*="Decrivez les responsabilites"]').fill(job.description);

  await page.getByRole('button', { name: /Continue to Review|Continuer vers la relecture/i }).click();
  await page.getByRole('button', { name: /Publish this job for free|Publier l'annonce gratuitement/i }).click();
}

async function dismissCookieBanner(page: Parameters<typeof test>[0]['page']) {
  const acceptCookiesBtn = page.getByRole('button', {
    name: /^Tout accepter$|^Accept all$/i,
  });

  try {
    await acceptCookiesBtn.waitFor({ state: 'visible', timeout: 2500 });
    await acceptCookiesBtn.click();
    await expect(acceptCookiesBtn).toBeHidden({ timeout: 5000 });
  } catch {
    // Banner absent in this run/context.
  }
}

async function primeFrontendSession(
  page: Parameters<typeof test>[0]['page'],
  user: typeof enterpriseUser,
) {
  await page.evaluate((sessionUser) => {
    window.localStorage.setItem('bolo237-user', JSON.stringify(sessionUser));
    window.localStorage.setItem('bolo237-account-role', String(sessionUser.role || ''));
    window.localStorage.setItem('bolo237-phone-verified', 'true');
    window.localStorage.setItem('bolo237-auth-last-success', String(Date.now()));
  }, user);
}