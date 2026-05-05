const Sentry = require('@sentry/node');

const PHONE_PLACEHOLDER_DOMAIN = '@phone.bolo237.com';
const DEFAULT_PUBLIC_WEB_URL = 'https://www.bolo237.com';

function getPublicWebUrl() {
  const configured = String(process.env.PUBLIC_WEB_URL || DEFAULT_PUBLIC_WEB_URL).trim();
  const normalized = configured || DEFAULT_PUBLIC_WEB_URL;
  return normalized.replace(/\/+$/, '') || DEFAULT_PUBLIC_WEB_URL;
}

function buildPublicUrl(pathname = '/') {
  const normalizedPathname = String(pathname || '/').startsWith('/')
    ? String(pathname || '/')
    : `/${String(pathname || '/')}`;

  return new URL(normalizedPathname, `${getPublicWebUrl()}/`).toString();
}

function isDeliverableUserEmail(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.endsWith(PHONE_PLACEHOLDER_DOMAIN)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeDetails(details) {
  if (!Array.isArray(details)) return [];

  return details
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);
}

function buildEmailBody({ headline, intro, details, ctaLabel, ctaUrl, footer }) {
  const safeHeadline = String(headline || 'Bolo237 update').trim();
  const safeIntro = String(intro || '').trim();
  const safeFooter = String(
    footer || 'You are receiving this email because this action was triggered from your Bolo237 account.'
  ).trim();
  const safeDetails = normalizeDetails(details);
  const safeCtaLabel = String(ctaLabel || '').trim();
  const safeCtaUrl = String(ctaUrl || '').trim();

  const textParts = [safeHeadline, '', safeIntro];

  if (safeDetails.length > 0) {
    textParts.push('', ...safeDetails.map((entry) => `- ${entry}`));
  }

  if (safeCtaLabel && safeCtaUrl) {
    textParts.push('', `${safeCtaLabel}: ${safeCtaUrl}`);
  }

  textParts.push('', safeFooter, '', 'Bolo237');

  const htmlDetails = safeDetails.length > 0
    ? `<ul style="margin:0 0 24px;padding-left:20px;color:#2f3a46;font-size:15px;line-height:1.7;">${safeDetails
        .map((entry) => `<li style="margin:0 0 8px;">${escapeHtml(entry)}</li>`)
        .join('')}</ul>`
    : '';

  const htmlCta = safeCtaLabel && safeCtaUrl
    ? `<p style="margin:0 0 28px;"><a href="${escapeHtml(safeCtaUrl)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:700;">${escapeHtml(safeCtaLabel)}</a></p>`
    : '';

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:32px 16px;background:#f4f6f8;font-family:Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr>
        <td style="padding:28px 28px 12px;background:linear-gradient(135deg,#0f766e,#134e4a);color:#ffffff;">
          <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;opacity:0.86;">Bolo237</p>
          <h1 style="margin:0;font-size:28px;line-height:1.2;">${escapeHtml(safeHeadline)}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">
          <p style="margin:0 0 24px;color:#2f3a46;font-size:15px;line-height:1.7;">${escapeHtml(safeIntro)}</p>
          ${htmlDetails}
          ${htmlCta}
          <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">${escapeHtml(safeFooter)}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    text: textParts.filter(Boolean).join('\n'),
    html,
  };
}

async function sendTransactionalEmail({
  transporter,
  to,
  subject,
  headline,
  intro,
  details,
  ctaLabel,
  ctaUrl,
  footer,
}) {
  const recipient = String(to || '').trim().toLowerCase();
  if (!isDeliverableUserEmail(recipient)) {
    return { delivery: 'skipped', sent: 0 };
  }

  const sender = String(process.env.EMAIL_FROM || process.env.EMAIL_USER || '').trim();
  const host = String(process.env.EMAIL_HOST || '').trim();
  const password = String(process.env.EMAIL_PASS || '').trim();
  if (!sender || !host || !password) {
    return { delivery: 'skipped', sent: 0 };
  }

  const body = buildEmailBody({ headline, intro, details, ctaLabel, ctaUrl, footer });

  try {
    await transporter.sendMail({
      from: sender,
      to: recipient,
      subject,
      text: body.text,
      html: body.html,
    });

    return { delivery: 'sent', sent: 1 };
  } catch (error) {
    console.error('[transactional-email] sendMail failed:', error?.message || error);
    Sentry.withScope((scope) => {
      scope.setTag('surface', 'transactional-email');
      scope.setContext('email', { subject: String(subject || '') });
      Sentry.captureException(error);
    });
    return { delivery: 'error', sent: 0 };
  }
}

function getDashboardPathForRole(role) {
  switch (String(role || '').trim().toUpperCase()) {
    case 'ENTREPRISE':
      return '/en/dashboard-entreprise';
    case 'ARTISAN':
      return '/en/dashboard-artisan';
    default:
      return '/en/dashboard';
  }
}

async function sendWelcomeEmail({ transporter, user }) {
  return sendTransactionalEmail({
    transporter,
    to: user?.email,
    subject: '[Bolo237] Welcome to your account',
    headline: 'Your Bolo237 account is ready',
    intro: `Hello ${user?.name || 'there'}, your account has been created successfully. You can now complete your profile and start using Bolo237.`,
    details: [
      `Role: ${String(user?.role || 'CANDIDAT').toLowerCase()}`,
      'Your profile may stay under review until moderation is complete.',
    ],
    ctaLabel: 'Open my dashboard',
    ctaUrl: buildPublicUrl(getDashboardPathForRole(user?.role)),
  });
}

async function sendAccountVerifiedEmail({ transporter, user }) {
  return sendTransactionalEmail({
    transporter,
    to: user?.email,
    subject: '[Bolo237] Your account has been verified',
    headline: 'Verification complete',
    intro: `Hello ${user?.name || 'there'}, your Bolo237 account has been verified. Your profile now carries the trusted badge.`,
    details: [
      'Your profile is now eligible for the trust badge and related features.',
      'You can continue publishing offers, applying, or updating your profile from your dashboard.',
    ],
    ctaLabel: 'Open my dashboard',
    ctaUrl: buildPublicUrl(getDashboardPathForRole(user?.role)),
  });
}

async function sendApplicationSentEmail({ transporter, user, job }) {
  return sendTransactionalEmail({
    transporter,
    to: user?.email,
    subject: '[Bolo237] Application sent',
    headline: 'Your application has been sent',
    intro: `Your application for ${job?.title || 'this opportunity'} has been sent successfully.`,
    details: [
      `Company: ${job?.company || 'Bolo237'}`,
      'Keep your profile updated so recruiters can review the strongest version of your file.',
    ],
    ctaLabel: 'Track my applications',
    ctaUrl: buildPublicUrl('/en/dashboard'),
  });
}

async function sendApplicationReceivedEmail({ transporter, employer, job, candidateName }) {
  const dashboardPath = String(employer?.role || '').trim().toUpperCase() === 'ENTREPRISE'
    ? '/en/dashboard-entreprise?section=applications'
    : getDashboardPathForRole(employer?.role);

  return sendTransactionalEmail({
    transporter,
    to: employer?.email,
    subject: '[Bolo237] New candidate application',
    headline: 'A new application just arrived',
    intro: `${candidateName || 'A candidate'} applied to ${job?.title || 'your listing'}.`,
    details: [
      `Listing: ${job?.title || 'Untitled listing'}`,
      `Company: ${job?.company || employer?.name || 'Bolo237'}`,
    ],
    ctaLabel: 'Open the applications inbox',
    ctaUrl: buildPublicUrl(dashboardPath),
  });
}

async function sendJobQueuedEmail({ transporter, author, job }) {
  const dashboardPath = String(author?.role || '').trim().toUpperCase() === 'ENTREPRISE'
    ? '/en/dashboard-entreprise?section=listings'
    : getDashboardPathForRole(author?.role);

  return sendTransactionalEmail({
    transporter,
    to: author?.email,
    subject: '[Bolo237] Listing received',
    headline: 'Your listing has been received',
    intro: `We received your listing ${job?.title || ''} and queued it for moderation.`,
    details: [
      `Company: ${job?.company || author?.name || 'Bolo237'}`,
      'You will see status changes directly in your dashboard once moderation is complete.',
    ],
    ctaLabel: 'Open my listings',
    ctaUrl: buildPublicUrl(dashboardPath),
  });
}

async function sendPasswordResetCodeEmail({ transporter, user, code }) {
  return sendTransactionalEmail({
    transporter,
    to: user?.email,
    subject: '[Bolo237] Password reset code',
    headline: 'Your password reset code',
    intro: 'Use the code below to reset your password. The code expires in 5 minutes.',
    details: [
      `Code: ${String(code || '').trim()}`,
      'If you did not request this change, ignore this email and keep your account under review.',
    ],
    ctaLabel: 'Open sign in',
    ctaUrl: buildPublicUrl('/en/connexion'),
  });
}

async function sendPasswordResetConfirmationEmail({ transporter, user }) {
  return sendTransactionalEmail({
    transporter,
    to: user?.email,
    subject: '[Bolo237] Password updated',
    headline: 'Your password has been updated',
    intro: 'Your Bolo237 password was changed successfully. You can now sign in with your new credentials.',
    details: [
      'If this was not you, reset your password again immediately and contact support.',
    ],
    ctaLabel: 'Sign in',
    ctaUrl: buildPublicUrl('/en/connexion'),
  });
}

module.exports = {
  buildPublicUrl,
  getDashboardPathForRole,
  isDeliverableUserEmail,
  sendTransactionalEmail,
  sendAccountVerifiedEmail,
  sendApplicationReceivedEmail,
  sendApplicationSentEmail,
  sendJobQueuedEmail,
  sendPasswordResetCodeEmail,
  sendPasswordResetConfirmationEmail,
  sendWelcomeEmail,
};