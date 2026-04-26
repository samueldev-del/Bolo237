const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.join(__dirname, '..', 'admin-settings.json');

const DEFAULT_NOTIFICATION_PREFERENCES = {
  emailOnNewReport: true,
  whatsappOnNewJob: true,
  emailOnInternalAdminAlert: true,
  whatsappOnInternalAdminAlert: true,
};

const DEFAULT_SETTINGS = {
  platformName: 'Bolo237',
  maintenanceMode: false,
  moderationRules: {
    autoApproveAfterPosts: 3,
    blockedKeywords: ['frais de dossier', 'transfert mobile money', 'investissement'],
  },
  notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
};

function normalizePlatformSettings(input = {}) {
  const raw = input && typeof input === 'object' ? input : {};
  const rawModerationRules = raw.moderationRules && typeof raw.moderationRules === 'object' ? raw.moderationRules : {};
  const rawNotificationPreferences = raw.notificationPreferences && typeof raw.notificationPreferences === 'object'
    ? raw.notificationPreferences
    : {};

  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    moderationRules: {
      ...DEFAULT_SETTINGS.moderationRules,
      ...rawModerationRules,
    },
    notificationPreferences: {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...rawNotificationPreferences,
    },
  };
}

let platformSettings = DEFAULT_SETTINGS;
try {
  platformSettings = normalizePlatformSettings(JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')));
} catch {
  // use defaults
}

function getPlatformSettings() {
  return platformSettings;
}

function setPlatformSettings(next) {
  platformSettings = normalizePlatformSettings(next);
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(platformSettings, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to persist admin settings:', error?.message || error);
  }
  return platformSettings;
}

module.exports = {
  SETTINGS_PATH,
  DEFAULT_SETTINGS,
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizePlatformSettings,
  getPlatformSettings,
  setPlatformSettings,
};
