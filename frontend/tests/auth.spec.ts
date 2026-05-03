import { test, expect } from '@playwright/test';

test.describe('Authentication flow', () => {
  test('signup transitions from ConnexionPage to OTP form', async ({ page }) => {
    const unique = Date.now();
    const email = `e2e.candidat.${unique}@example.com`;

    await page.route('**/api/backend/users', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 90001,
          email,
          name: 'E2E Test Candidate',
          role: 'CANDIDAT',
          isVerified: false,
          createdAt: new Date().toISOString(),
        }),
      });
    });

    await page.route('**/api/backend/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 90001,
          email,
          name: 'E2E Test Candidate',
          role: 'CANDIDAT',
          isVerified: false,
          createdAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/connexion');

    const acceptCookiesBtn = page.getByRole('button', {
      name: /^Tout accepter$|^Accept all$/i,
    });

    // Cookie banners are transient: it can appear after hydration.
    // Wait briefly, click only if it shows up, then ensure it no longer blocks clicks.
    try {
      await acceptCookiesBtn.waitFor({ state: 'visible', timeout: 2500 });
      await acceptCookiesBtn.click();
      await expect(acceptCookiesBtn).toBeHidden({ timeout: 5000 });
    } catch {
      // Banner absent in this run/context: continue test flow.
    }

    await expect(
      page.getByRole('heading', { name: /Connexion|Sign in/i })
    ).toBeVisible();

    await page.getByRole('button', { name: /S'inscrire|Sign up/i }).click();

    await expect(
      page.getByRole('heading', { name: /Creer votre compte|Create your account/i })
    ).toBeVisible();

    await page.getByRole('button', { name: /Candidat/i }).click();

    await page.locator('input[autocomplete="family-name"]').fill('E2E');
    await page.locator('input[autocomplete="given-name"]').fill('Candidate');
    await page.locator('input[autocomplete="tel"]').fill('699001122');
    await page.locator('input[autocomplete="email"]').fill(email);
    await page.locator('input[autocomplete="new-password"]').first().fill('Test1234!');
    await page.locator('input[autocomplete="new-password"]').nth(1).fill('Test1234!');

    await page.getByRole('button', { name: /S'inscrire|Sign up/i }).click();

    await expect(
      page.getByRole('heading', { name: /Verifiez votre identite|Verify your identity/i })
    ).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Envoyer le code de verification|Send verification code/i })
    ).toBeVisible();
  });
});
