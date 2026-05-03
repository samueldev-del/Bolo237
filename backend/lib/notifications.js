const { prisma } = require('./db');
const {
  sendInternalAlertEmail,
  buildInternalAlertText,
} = require('./emailService');
const {
  sendWhatsAppAlertToTargets,
  getInternalAlertWhatsAppTargets,
} = require('./twilioService');
const { getPlatformSettings, DEFAULT_NOTIFICATION_PREFERENCES } = require('./settings');

async function createNotification({ userId, type, title, message, data }) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: data || undefined,
    },
  });
}

async function createAdminNotifications({
  title,
  message,
  type = 'admin_alert',
  data,
  excludeUserIds = [],
  emailAlert = false,
  whatsappAlert = false,
  replyTo,
}) {
  const admins = await prisma.user.findMany({
    where: {
      role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      isBanned: false,
      ...(excludeUserIds.length ? { id: { notIn: excludeUserIds } } : {}),
    },
    select: { id: true, email: true, name: true },
  });

  if (admins.length === 0) {
    return { sent: 0, emailDelivery: 'skipped', whatsappDelivery: 'skipped' };
  }

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type,
      title,
      message,
      data: data || undefined,
    })),
    skipDuplicates: true,
  });

  const realtimeText = buildInternalAlertText({ title, message, type, data });
  const notificationPreferences = getPlatformSettings()?.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES;
  const [emailResult, whatsappResult] = await Promise.all([
    emailAlert && notificationPreferences.emailOnInternalAdminAlert
      ? sendInternalAlertEmail({ subject: `[Bolo237] ${title}`, text: realtimeText, admins, replyTo })
      : Promise.resolve({ delivery: 'skipped', sent: 0 }),
    whatsappAlert && notificationPreferences.whatsappOnInternalAdminAlert
      ? sendWhatsAppAlertToTargets(realtimeText, getInternalAlertWhatsAppTargets())
      : Promise.resolve({ delivery: 'skipped', sent: 0 }),
  ]);

  return {
    sent: admins.length,
    emailDelivery: emailResult.delivery,
    whatsappDelivery: whatsappResult.delivery,
  };
}

module.exports = {
  createNotification,
  createAdminNotifications,
};
