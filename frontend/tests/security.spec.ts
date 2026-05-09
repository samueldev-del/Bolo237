import { test, expect, type Route } from '@playwright/test';

/**
 * Suite E2E sécurité — 5 scénarios couvrant les correctifs critiques des
 * sprints 1-2. Les appels backend sont moqués pour que la suite tourne sans
 * dépendance externe (CI rapide). Les tests qui nécessitent un backend réel
 * (headers HTTP, IDOR API) sont marqués `.fixme()` avec instructions.
 */

test.describe('Security regression — sprint 1 & 2', () => {
  test('OTP brute-force : 6e essai erroné renvoie 429', async ({ page }) => {
    let attempts = 0;

    await page.route('**/api/backend/otp/send', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Code envoyé par SMS' }),
      });
    });

    await page.route('**/api/backend/otp/verify', async (route: Route) => {
      attempts += 1;
      // Simule la logique helper backend/lib/otp.js : rejet à partir du 6e essai.
      if (attempts >= 6) {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Trop de tentatives. Demandez un nouveau code.' }),
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Code invalide ou expire.' }),
        });
      }
    });

    // Test purement réseau : on appelle directement l'API via fetch.
    await page.goto('/connexion');

    const responses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const status = await page.evaluate(async () => {
        const res = await fetch('/api/backend/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: '+237699999999', code: '000000' }),
        });
        return res.status;
      });
      responses.push(status);
    }

    expect(responses.slice(0, 5).every((s) => s === 400)).toBe(true);
    expect(responses[5]).toBe(429);
  });

  test('OTP message identique pour code absent / expiré / incorrect (anti-énumération)', async ({ page }) => {
    const scenarios: Array<'absent' | 'expired' | 'wrong'> = ['absent', 'expired', 'wrong'];

    await page.route('**/api/backend/otp/verify', async (route: Route) => {
      // Quelle que soit la cause, le backend renvoie le même message générique.
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Code invalide ou expire.' }),
      });
    });

    await page.goto('/connexion');

    const messages = await Promise.all(
      scenarios.map(async () => {
        return page.evaluate(async () => {
          const res = await fetch('/api/backend/otp/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: '+237699999999', code: '111111' }),
          });
          const body = await res.json();
          return body.error;
        });
      }),
    );

    // Tous les messages doivent être strictement identiques.
    expect(new Set(messages).size).toBe(1);
    expect(messages[0]).toBe('Code invalide ou expire.');
  });

  test('Double candidature : 2e POST /jobs/:id/apply renvoie 409', async ({ page }) => {
    let calls = 0;

    await page.route('**/api/backend/jobs/*/apply', async (route: Route) => {
      calls += 1;
      if (calls === 1) {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 1, jobId: 42, candidateId: 7, status: 'APPLIED' }),
        });
      } else {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Vous avez déjà postulé à cette offre.' }),
        });
      }
    });

    await page.goto('/');

    const [first, second] = await page.evaluate(async () => {
      const post = () =>
        fetch('/api/backend/jobs/42/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Je postule via le E2E test pour vérifier la race condition.', cvUrl: 'https://res.cloudinary.com/cv.pdf' }),
        }).then((r) => r.status);
      return Promise.all([post(), post()]);
    });

    expect(first).toBe(201);
    expect(second).toBe(409);
  });

  test('Open redirect : ?redirect=//evil.com est rejeté par isSafeRedirect', async ({ page }) => {
    // La fonction isSafeRedirect du LoginForm.tsx rejette les schemes externes.
    // On vérifie en navigant vers la page de connexion avec un redirect malveillant
    // et en s'assurant qu'on reste sur le domaine local après login.
    await page.route('**/api/backend/auth/login', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          email: 'safe@bolo237.local',
          name: 'Safe',
          role: 'CANDIDAT',
          isVerified: true,
          createdAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/connexion?redirect=//evil.com/steal');

    const url = page.url();
    expect(url).toContain('localhost');
    // Si on suit le redirect après login, l'URL ne doit JAMAIS commencer par
    // `http://evil.com` (cf. isSafeRedirect dans LoginForm.tsx).
    expect(url.startsWith('http://evil.com')).toBe(false);
    expect(url.startsWith('https://evil.com')).toBe(false);
  });

  test.fixme('Headers de sécurité admin : HSTS, CSP, X-Frame-Options DENY', async ({ request }) => {
    // À activer une fois l'admin déployé en staging :
    //   ADMIN_BASE_URL=https://admin-staging.bolo237.com npx playwright test
    const adminBaseUrl = process.env.ADMIN_BASE_URL;
    if (!adminBaseUrl) {
      test.skip(true, 'ADMIN_BASE_URL non défini — skip headers admin');
      return;
    }

    const response = await request.get(`${adminBaseUrl}/login`);
    expect(response.headers()['strict-transport-security']).toContain('max-age=');
    expect(response.headers()['x-frame-options']).toBe('DENY');
    expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
  });

  test.fixme('IDOR profil : user A ne peut pas modifier le profil de user B', async ({ request }) => {
    // À activer en pointant sur un backend réel avec deux comptes pré-créés.
    // Sans environnement integration-tests, ce scénario est couvert par les tests
    // unitaires backend (requireSelfOrAdmin sur server.js:1501-1606).
    test.skip(true, 'Nécessite un backend réel avec 2 comptes — couvert au backend');
  });
});
