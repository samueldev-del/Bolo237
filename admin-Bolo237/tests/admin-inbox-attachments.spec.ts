import { test, expect } from '@playwright/test';
import { ADMIN_SESSION_COOKIE_NAME, createAdminSessionToken } from './utils/admin-session';

test.describe('Admin inbox attachment downloads', () => {
  test('downloads attachments through the admin backend proxy instead of a raw document URL', async ({ context, page }) => {
    await context.addCookies([
      {
        name: ADMIN_SESSION_COOKIE_NAME,
        value: createAdminSessionToken(),
        url: 'http://localhost:3110',
        httpOnly: true,
        sameSite: 'Strict',
      },
    ]);

    await page.route('**/api/backend/admin/me/notifications**', async (route) => {
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

    await page.route('**/api/backend/admin/emails/summary**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          summary: {
            totalCount: 1,
            unreadCount: 1,
            repliedCount: 0,
            readCount: 0,
            lastMessageAt: new Date().toISOString(),
          },
          sync: {
            enabled: true,
            mailbox: 'support@bolo237.com',
            syncing: false,
            lastSyncedAt: new Date().toISOString(),
            lastError: null,
            lastErrorAt: null,
            totalInMailbox: 1,
            unreadInMailbox: 1,
          },
        }),
      });
    });

    await page.route('**/api/backend/admin/emails?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 501,
              messageId: '<msg-501@bolo237.test>',
              imapUid: 501,
              mailboxPath: 'INBOX',
              senderEmail: 'candidate@example.com',
              senderName: 'Candidate Support',
              subject: 'Documents de verification',
              body: 'Bonjour, voici les pieces jointes demandees.',
              attachments: [
                {
                  part: 'part-1',
                  filename: 'piece-identite.pdf',
                  contentType: 'application/pdf',
                  size: 24576,
                  encoding: 'base64',
                  inline: false,
                },
              ],
              status: 'UNREAD',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          summary: {
            totalCount: 1,
            unreadCount: 1,
            repliedCount: 0,
            readCount: 0,
            lastMessageAt: new Date().toISOString(),
          },
          sync: {
            enabled: true,
            mailbox: 'support@bolo237.com',
            syncing: false,
            lastSyncedAt: new Date().toISOString(),
            lastError: null,
            lastErrorAt: null,
            totalInMailbox: 1,
            unreadInMailbox: 1,
          },
        }),
      });
    });

    await page.route('**/api/backend/admin/emails/501/attachments/part-1/download', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: '%PDF-1.4\n% mock attachment\n',
      });
    });

    await page.goto('/inbox');

    await expect(page.getByRole('heading', { name: 'Documents de verification' })).toBeVisible();
    await expect(page.getByText('piece-identite.pdf')).toBeVisible();

    await Promise.all([
      page.waitForResponse((response) => {
        return response.request().method() === 'GET'
          && response.url().includes('/api/backend/admin/emails/501/attachments/part-1/download');
      }),
      page.getByRole('button', { name: /^Telecharger$/ }).click(),
    ]);
  });
});