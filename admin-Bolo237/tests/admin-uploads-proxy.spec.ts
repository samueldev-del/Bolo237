import { test, expect } from '@playwright/test';
import { ADMIN_SESSION_COOKIE_NAME, createAdminSessionToken } from './utils/admin-session';

test.describe('Admin first-party upload links', () => {
  test('moderation KYC rewrites backend document URLs to the admin upload proxy', async ({ context, page }) => {
    await context.addCookies([
      {
        name: ADMIN_SESSION_COOKIE_NAME,
        value: createAdminSessionToken(),
        url: 'http://localhost:3110',
        httpOnly: true,
        sameSite: 'Strict',
      },
    ]);

    await page.route('**/api/backend/admin/verifications**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'verif-42',
              role: 'entreprise',
              accountKey: 'ent-42',
              displayName: 'Entreprise E2E',
              phone: '+237699000111',
              status: 'pending',
              submittedAt: new Date().toISOString(),
              payload: {
                legalDocUrl: 'http://localhost:5001/uploads/candidate-documents/u42__kbis.pdf',
                idFrontPreview: 'http://localhost:5001/uploads/candidate-documents/u42__id-front.png',
                managerName: 'Ada Lovelace',
              },
            },
          ],
        }),
      });
    });

    const verificationsResponse = page.waitForResponse((response) => {
      return response.request().method() === 'GET' && response.url().includes('/api/backend/admin/verifications');
    });

    await page.goto('/moderation/artisans');
    await verificationsResponse;

    await expect(page.getByRole('heading', { name: /En attente de verification/i })).toBeVisible();
    await expect(page.getByText('Entreprise E2E')).toBeVisible();

    const documentLink = page.getByRole('link', { name: /Ouvrir le document/i });
    await expect(documentLink).toHaveAttribute('href', '/api/uploads/candidate-documents/u42__kbis.pdf');

    const previewLink = page.locator('a[href="/api/uploads/candidate-documents/u42__id-front.png"]');
    await expect(previewLink).toBeVisible();
  });
});