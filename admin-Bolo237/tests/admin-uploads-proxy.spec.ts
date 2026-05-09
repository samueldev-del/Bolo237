import { test, expect } from '@playwright/test';
import { ADMIN_SESSION_COOKIE_NAME, createAdminSessionToken } from './utils/admin-session';

test.describe('Admin first-party upload links', () => {
  test('moderation KYC rewrites backend document URLs to the admin upload proxy', async ({ context, page }) => {
    let resolveVerificationsRequest;
    const verificationsRequest = new Promise((resolve) => {
      resolveVerificationsRequest = resolve;
    });

    await context.addCookies([
      {
        name: ADMIN_SESSION_COOKIE_NAME,
        value: createAdminSessionToken(),
        url: 'http://localhost:3110',
        httpOnly: true,
        sameSite: 'Strict',
      },
    ]);

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
            lastSyncedAt: new Date().toISOString(),
            lastError: null,
            lastErrorAt: null,
            totalInMailbox: 0,
            unreadInMailbox: 0,
          },
        }),
      });
    });

    await context.route(/\/api\/backend\/admin\/verifications(?:\?.*)?$/, async (route) => {
      if (resolveVerificationsRequest) {
        resolveVerificationsRequest();
        resolveVerificationsRequest = null;
      }

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

    await page.goto('/moderation/artisans');
    await verificationsRequest;

    await expect(page.getByRole('heading', { name: /En attente de verification/i })).toBeVisible();
    await expect(page.getByText('Entreprise E2E')).toBeVisible();

    const documentLink = page.getByRole('link', { name: /Ouvrir le document/i });
    await expect(documentLink).toHaveAttribute('href', '/api/uploads/candidate-documents/u42__kbis.pdf');

    const previewLink = page.locator('a[href="/api/uploads/candidate-documents/u42__id-front.png"]');
    await expect(previewLink).toBeVisible();
  });
});