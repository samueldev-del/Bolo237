import { test, expect } from '@playwright/test';

test.describe('First-party upload links', () => {
  test('cvtheque rewrites default CV links to the frontend upload proxy', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('bolo237-user', JSON.stringify({
        id: 901,
        role: 'ENTREPRISE',
        name: 'E2E Recruiter',
      }));
      window.localStorage.setItem('bolo237-account-role', 'entreprise');
    });

    await page.route('**/api/backend/candidates**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [
            {
              id: 71,
              userId: 701,
              nom: 'Candidate E2E',
              titre: 'Developpeur Frontend',
              localisation: 'Douala',
              experience: 'Confirme',
              disponibilite: 'Immediatement',
              etudes: 'Bac+3',
              cvMajJours: 2,
              competences: ['React', 'Next.js'],
              disponibleNow: true,
              createdAt: new Date().toISOString(),
              defaultCvUrl: 'http://localhost:5001/uploads/cv/u701__sample.pdf',
            },
          ],
          pagination: {
            page: 1,
            limit: 12,
            total: 1,
            totalPages: 1,
          },
        }),
      });
    });

    await page.goto('/fr/cvtheque');

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

    await expect(page.getByText('Candidate E2E')).toBeVisible();

    const openDefaultCvLink = page.getByRole('link', { name: /Ouvrir le CV principal|Open default CV/i });
    await expect(openDefaultCvLink).toHaveAttribute('href', '/api/uploads/cv/u701__sample.pdf');
  });
});