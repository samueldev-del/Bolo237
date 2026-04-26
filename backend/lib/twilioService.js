const twilio = require('twilio');
const { parseCommaSeparatedValues } = require('./env');

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

if (twilioClient) {
  console.log('✅ Twilio client initialized');
  if (process.env.TWILIO_WHATSAPP_FROM && process.env.TWILIO_WHATSAPP_TO) {
    console.log(`✅ WhatsApp alerts: FROM=${process.env.TWILIO_WHATSAPP_FROM} TO=${process.env.TWILIO_WHATSAPP_TO}`);
  } else {
    console.warn('⚠️ Twilio client OK but TWILIO_WHATSAPP_FROM or TWILIO_WHATSAPP_TO missing — WhatsApp alerts disabled');
  }
} else {
  console.warn('⚠️ Twilio not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN missing) — WhatsApp alerts disabled');
}

function normalizeWhatsAppTarget(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('whatsapp:')) return trimmed;
  return `whatsapp:${trimmed.replace(/^\+?/, '+')}`;
}

function getInternalAlertWhatsAppTargets() {
  const configuredTargets = parseCommaSeparatedValues(
    process.env.ADMIN_INTERNAL_ALERT_WHATSAPP_TO || process.env.TWILIO_WHATSAPP_TO,
  );
  return configuredTargets
    .map((target) => normalizeWhatsAppTarget(target))
    .filter(Boolean);
}

async function sendWhatsAppModerationAlert(messageBody) {
  if (!twilioClient) {
    console.log('📩 [WhatsApp SKIP - no client]', messageBody.split('\n')[0]);
    return { delivery: 'skipped', sent: 0 };
  }
  if (!process.env.TWILIO_WHATSAPP_FROM || !process.env.TWILIO_WHATSAPP_TO) {
    console.log('📩 [WhatsApp SKIP - no FROM/TO]', messageBody.split('\n')[0]);
    return { delivery: 'skipped', sent: 0 };
  }

  try {
    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: process.env.TWILIO_WHATSAPP_TO,
      body: messageBody,
    });
    console.log('📩 [WhatsApp SENT]', messageBody.split('\n')[0]);
    return { delivery: 'sent', sent: 1 };
  } catch (error) {
    console.error('📩 [WhatsApp ERROR]', error?.message || error);
    return { delivery: 'error', sent: 0 };
  }
}

async function sendWhatsAppAlertToTargets(messageBody, targets) {
  if (!twilioClient) {
    console.log('📩 [WhatsApp SKIP - no client]', messageBody.split('\n')[0]);
    return { delivery: 'skipped', sent: 0 };
  }
  if (!process.env.TWILIO_WHATSAPP_FROM) {
    console.log('📩 [WhatsApp SKIP - no FROM]', messageBody.split('\n')[0]);
    return { delivery: 'skipped', sent: 0 };
  }

  const resolvedTargets = (Array.isArray(targets) ? targets : []).filter(Boolean);
  if (resolvedTargets.length === 0) {
    console.log('📩 [WhatsApp SKIP - no targets]', messageBody.split('\n')[0]);
    return { delivery: 'skipped', sent: 0 };
  }

  try {
    await Promise.all(
      resolvedTargets.map((target) => twilioClient.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: target,
        body: messageBody,
      })),
    );
    console.log('📩 [WhatsApp SENT]', messageBody.split('\n')[0]);
    return { delivery: 'sent', sent: resolvedTargets.length };
  } catch (error) {
    console.error('📩 [WhatsApp ERROR]', error?.message || error);
    return { delivery: 'error', sent: 0 };
  }
}

async function sendOtpWithTwilio(phone, code) {
  if (!twilioClient || !process.env.TWILIO_PHONE_NUMBER) {
    return false;
  }

  const normalizedPhone = String(phone).startsWith('+')
    ? String(phone)
    : `+${String(phone).replace(/^\+/, '')}`;

  try {
    await twilioClient.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: normalizedPhone,
      body: `Votre code Bolo237 est ${code}. Il expire dans 5 minutes.`,
    });
    console.log(`[OTP] SMS sent to ${normalizedPhone}`);
    return true;
  } catch (error) {
    console.error('[OTP] Twilio SMS error:', error?.message || error);
    return false;
  }
}

module.exports = {
  twilioClient,
  normalizeWhatsAppTarget,
  getInternalAlertWhatsAppTargets,
  sendWhatsAppModerationAlert,
  sendWhatsAppAlertToTargets,
  sendOtpWithTwilio,
};
