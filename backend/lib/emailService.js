const nodemailer = require('nodemailer');
const { parseCommaSeparatedValues } = require('./env');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 465),
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function getInternalAlertEmailRecipients(admins) {
  const recipients = new Set(parseCommaSeparatedValues(process.env.ADMIN_INTERNAL_ALERT_EMAILS));

  admins.forEach((admin) => {
    if (admin?.email) {
      recipients.add(String(admin.email).trim());
    }
  });

  return Array.from(recipients).filter(Boolean);
}

async function sendInternalAlertEmail({ subject, text, admins, replyTo }) {
  const recipients = getInternalAlertEmailRecipients(admins);

  if (recipients.length === 0) {
    console.log('[ADMIN ALERT EMAIL SKIP] No recipients configured');
    return { delivery: 'skipped', sent: 0 };
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: recipients.join(','),
      replyTo,
      subject,
      text,
    });
    console.log('[ADMIN ALERT EMAIL SENT]', subject);
    return { delivery: 'sent', sent: recipients.length };
  } catch (error) {
    console.error('[ADMIN ALERT EMAIL ERROR]', error?.message || error);
    return { delivery: 'error', sent: 0 };
  }
}

function buildInternalAlertText({ title, message, type, data }) {
  const lines = [
    `[Bolo237] ${title}`,
    `Type: ${type}`,
    '',
    message,
  ];

  if (data && typeof data === 'object') {
    const entries = Object.entries(data)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);

    if (entries.length > 0) {
      lines.push('', 'Meta:', ...entries);
    }
  }

  return lines.join('\n');
}

async function notifyPrivacyTeam({ subject, text, replyTo }) {
  const recipient = process.env.EMAIL_USER || 'contact@bolo237.com';

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: recipient,
      replyTo,
      subject,
      text,
    });
    return 'email';
  } catch (error) {
    console.error('Privacy notification email error:', error?.message || error);
    console.log(`[PRIVACY REQUEST] ${subject}\n${text}`);
    return 'log';
  }
}

module.exports = {
  transporter,
  getInternalAlertEmailRecipients,
  sendInternalAlertEmail,
  buildInternalAlertText,
  notifyPrivacyTeam,
};
