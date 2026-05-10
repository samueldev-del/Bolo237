import { expect, test } from '@playwright/test';

const CSRF_TOKEN = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const NOW = '2025-01-15T08:30:00.000Z';

const candidateUser = {
  id: 101,
  email: 'candidate.e2e@example.com',
  name: 'Candidate E2E',
  role: 'CANDIDAT',
  isVerified: true,
  createdAt: NOW,
};

const approvedJobs = [
  {
    id: 501,
    title: 'Developpeur Backend Node.js',
    company: 'Bolo Digital',
    location: 'Douala, Cameroun',
    description: 'Concevez des APIs fiables pour les entreprises camerounaises.',
    salary: '450000',
    status: 'APPROVED',
    authorId: 77,
    createdAt: NOW,
    externalApplyUrl: 'https://company.example/apply/backend-node',
    author: {
      id: 77,
      name: 'Bolo Digital',
      email: 'jobs@bolo.example',
      role: 'ENTREPRISE',
      isVerified: true,
      photoUrl: null,
    },
  },
  {
    id: 502,
    title: 'Comptable Junior',
    company: 'Mboa Finance',
    location: 'Yaounde, Cameroun',
    description: 'Rejoignez une equipe finance en croissance.',
    salary: '250000',
    status: 'APPROVED',
    authorId: 78,
    createdAt: NOW,
    author: {
      id: 78,
      name: 'Mboa Finance',
      email: 'talent@mboa.example',
      role: 'ENTREPRISE',
      isVerified: false,
      photoUrl: null,
    },
  },
];

test.describe('Candidate role flow', () => {
  test('logs in, searches offers, opens an offer detail, and validates the apply CTA', async ({ page }) => {
    await mockCandidateApis(page);

    await page.goto('/connexion');
    await dismissCookieBanner(page);

    await page.getByPlaceholder(/name@example.com or \+2376|nom@example.com ou \+2376/i).fill(candidateUser.email);
    await page.getByPlaceholder('••••••••').fill('Test1234!');
    await page.getByRole('button', { name: /Sign in|Se connecter/i }).click();

    await expect(page.getByRole('heading', { name: /Candidate E2E/i })).toBeVisible();
    await persistFrontendSession(page, candidateUser);

    await page.goto('/emplois');

    const searchInput = page.locator('input[placeholder*="Poste"], input[placeholder*="Job title"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Developpeur');
    await page.getByRole('button', { name: /Trouver un emploi|Find jobs/i }).click();

    await expect(page.getByRole('link', { name: 'Developpeur Backend Node.js' })).toBeVisible();
    await expect(page.getByText('Comptable Junior')).toBeHidden();

    await page.getByRole('link', { name: /Voir l'offre|View offer/i }).click();

    await expect(page).toHaveURL(/\/annonce\//);
    await expect(page.getByRole('heading', { name: 'Developpeur Backend Node.js' })).toBeVisible();

    const applyLink = page.getByRole('link', { name: /Postuler|Apply/i }).first();
    await expect(applyLink).toBeVisible();
    await expect(applyLink).toHaveAttribute('href', 'https://company.example/apply/backend-node');
    await expect(applyLink).toHaveAttribute('target', '_blank');
  });
});

async function mockCandidateApis(page: Parameters<typeof test>[0]['page']) {
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
      body: JSON.stringify(candidateUser),
    });
  });

  await page.route(/\/api\/backend\/auth\/me$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...candidateUser,
        phone: '+237699000101',
      }),
    });
  });

  await page.route(/\/api\/backend\/profiles\/101$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        userId: 101,
        fullName: 'Candidate E2E',
        title: 'Developpeur backend',
        location: 'Douala',
        availability: 'Immediatement',
        profileVisible: true,
        jobAlertRole: 'Developpeur',
        jobAlertCity: 'Douala',
        phone: '+237699000101',
        email: candidateUser.email,
        profile: 'Profil de test Playwright',
        defaultCvUrl: 'https://cdn.example/cv.pdf',
        experience: '3 ans',
        education: 'Licence',
        skillsText: 'Node.js, TypeScript',
        languagesText: 'Francais, Anglais',
        updatedAt: NOW,
      }),
    });
  });

  await page.route(/\/api\/backend\/users\/101\/saved-jobs(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ jobs: [] }),
    });
  });

  await page.route(/\/api\/backend\/users\/101\/applications(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ applications: [] }),
    });
  });

  await page.route(/\/api\/backend\/jobs(?:\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const search = (url.searchParams.get('search') || '').toLowerCase();
    const location = (url.searchParams.get('location') || '').toLowerCase();

    const jobs = approvedJobs.filter((job) => {
      const matchesSearch = !search || `${job.title} ${job.company} ${job.description}`.toLowerCase().includes(search);
      const matchesLocation = !location || job.location.toLowerCase().includes(location);
      return matchesSearch && matchesLocation;
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobs,
        pagination: { page: 1, limit: jobs.length || 1, total: jobs.length, totalPages: 1 },
      }),
    });
  });

  await page.route(/\/api\/backend\/jobs\/501$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(approvedJobs[0]),
    });
  });

  await page.route(/\/api\/backend\/jobs\/501\/view$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
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

async function persistFrontendSession(
  page: Parameters<typeof test>[0]['page'],
  user: typeof candidateUser,
) {
  await page.evaluate((sessionUser) => {
    window.localStorage.setItem('bolo237-user', JSON.stringify(sessionUser));
    window.localStorage.setItem('bolo237-account-role', String(sessionUser.role || ''));
    window.localStorage.setItem('bolo237-phone-verified', 'true');
    window.localStorage.setItem('bolo237-auth-last-success', String(Date.now()));
  }, user);
}