import { expect, test } from '@playwright/test';

const CSRF_TOKEN = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const NOW = '2025-01-15T08:30:00.000Z';

const artisanUser = {
  id: 33,
  email: 'artisan.e2e@example.com',
  name: 'Atelier Mboa',
  role: 'ARTISAN',
  isVerified: true,
  photoUrl: '/logo.svg',
  createdAt: NOW,
};

test.describe('Artisan role flow', () => {
  test('signs in, adds a service, and publishes an ad visible in current ads', async ({ page }) => {
    const serviceRequests: Array<Record<string, unknown>> = [];
    const adRequests: Array<Record<string, unknown>> = [];
    await mockArtisanApis(page, serviceRequests, adRequests);

    await page.goto('/connexion');
    await dismissCookieBanner(page);

    await primeFrontendSession(page, artisanUser);
    await page.getByPlaceholder(/name@example.com or \+2376|nom@example.com ou \+2376/i).fill(artisanUser.email);
    await page.getByPlaceholder('••••••••').fill('Test1234!');
    await page.getByRole('button', { name: /Sign in|Se connecter/i }).click();

    const servicesTab = page.getByRole('button', { name: 'Services', exact: true });
    await expect(servicesTab).toBeVisible({ timeout: 10000 });

    await servicesTab.click();
    await page.getByRole('button', { name: /Add a service|Ajouter un service/i }).click();
    await page.getByPlaceholder(/Service name|Nom du service/i).fill('Installation electrique');
    await page.getByPlaceholder(/Description \(optional\)|Description \(optionnel\)/i).fill('Interventions rapides pour maisons et commerces.');
    await page.getByPlaceholder(/Price in FCFA|Prix en FCFA/i).fill('15000');
    await page.getByRole('button', { name: /Save service|Enregistrer/i }).click();

    await expect.poll(() => serviceRequests.length).toBe(1);
    expect(serviceRequests[0]).toMatchObject({
      name: 'Installation electrique',
      description: 'Interventions rapides pour maisons et commerces.',
      price: '15000',
    });

    const serviceCard = page.locator('div').filter({ hasText: 'Installation electrique' }).first();
    await expect(serviceCard).toBeVisible();
    await expect(serviceCard.getByText('15000 FCFA')).toBeVisible();

    await page.getByRole('button', { name: /Job Ads|Annonces/i }).click();
    await page.getByPlaceholder(/Ad title \(required\)|Titre de l annonce/i).fill('Besoin urgent de peintres qualifies');
    await page.getByPlaceholder(/Ad description \(required\)|Description de l annonce/i).fill('Recherche deux peintres disponibles cette semaine pour un chantier a Douala.');
    await page.getByPlaceholder(/Location \(e.g. Douala\)|Lieu \(ex: Douala\)/i).fill('Douala');
    await page.getByRole('button', { name: /Publish to backend|Publier sur le backend/i }).click();

    await expect.poll(() => adRequests.length).toBe(1);
    expect(adRequests[0]).toMatchObject({
      title: 'Besoin urgent de peintres qualifies',
      company: 'Atelier Mboa',
      location: 'Douala',
    });

    await expect(
      page.getByText(/pending admin review|validation admin|Publication reussie/i),
    ).toBeVisible();

    const adCard = page.locator('div').filter({ hasText: 'Besoin urgent de peintres qualifies' }).first();
    await expect(adCard).toBeVisible();
    await expect(adCard.getByText('PENDING', { exact: true })).toBeVisible();
  });
});

async function mockArtisanApis(
  page: Parameters<typeof test>[0]['page'],
  serviceRequests: Array<Record<string, unknown>>,
  adRequests: Array<Record<string, unknown>>,
) {
  const services: Array<{
    id: number;
    userId: number;
    name: string;
    description: string;
    price: string;
    createdAt: string;
  }> = [];
  const ads: Array<Record<string, unknown>> = [];

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
      body: JSON.stringify(artisanUser),
    });
  });

  await page.route(/\/api\/backend\/auth\/me$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...artisanUser,
        phone: '+237699330033',
      }),
    });
  });

  await page.route(/\/api\/backend\/profiles\/33$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        userId: 33,
        fullName: 'Atelier Mboa',
        title: 'Electricien',
        location: 'Douala',
        availability: 'Immediatement',
        profileVisible: true,
        jobAlertRole: '',
        jobAlertCity: '',
        phone: '+237699330033',
        email: artisanUser.email,
        profile: 'Artisan de confiance pour installations et depannages.',
        defaultCvUrl: '',
        experience: '6 ans',
        education: 'CAP',
        skillsText: 'Electricite, maintenance',
        languagesText: 'Francais',
        updatedAt: NOW,
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

  await page.route(/\/api\/backend\/dashboard-artisan\/overview(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ jobs: ads, profileViews: 12, clickHistory: [] }),
    });
  });

  await page.route(/\/api\/backend\/users\/33\/services(?:\?.*)?$/, async (route) => {
    if (route.request().method() === 'POST') {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      serviceRequests.push(payload);
      const createdService = {
        id: services.length + 1,
        userId: 33,
        name: String(payload.name || ''),
        description: String(payload.description || ''),
        price: String(payload.price || ''),
        createdAt: NOW,
      };
      services.unshift(createdService);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ service: createdService }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ services }),
    });
  });

  await page.route(/\/api\/backend\/users\/33\/portfolio(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        portfolio: [],
        pagination: { page: 1, limit: 9, total: 0, totalPages: 1 },
      }),
    });
  });

  await page.route(/\/api\/backend\/jobs$/, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ jobs: ads, pagination: { page: 1, limit: 10, total: ads.length, totalPages: 1 } }),
      });
      return;
    }

    const payload = route.request().postDataJSON() as Record<string, unknown>;
    adRequests.push(payload);
    const createdAd = {
      id: 700 + ads.length,
      title: String(payload.title || ''),
      company: String(payload.company || artisanUser.name),
      location: String(payload.location || 'Douala'),
      description: String(payload.description || ''),
      salary: String(payload.salary || ''),
      status: 'PENDING',
      authorId: artisanUser.id,
      createdAt: NOW,
      author: {
        id: artisanUser.id,
        name: artisanUser.name,
        email: artisanUser.email,
        role: artisanUser.role,
        isVerified: true,
        photoUrl: artisanUser.photoUrl,
      },
    };
    ads.unshift(createdAd);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ job: createdAd }),
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

async function primeFrontendSession(
  page: Parameters<typeof test>[0]['page'],
  user: typeof artisanUser,
) {
  await page.evaluate((sessionUser) => {
    window.localStorage.setItem('bolo237-user', JSON.stringify(sessionUser));
    window.localStorage.setItem('bolo237-account-role', String(sessionUser.role || ''));
    window.localStorage.setItem('bolo237-phone-verified', 'true');
    window.localStorage.setItem('bolo237-auth-last-success', String(Date.now()));
  }, user);
}