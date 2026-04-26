const Sentry = require('@sentry/node');
const { getSampleRateFromEnv } = require('./env');

const sentryDsn = String(process.env.SENTRY_DSN || '').trim();
const sentryEnabled = Boolean(sentryDsn);

Sentry.init({
  enabled: sentryEnabled,
  dsn: sentryDsn || undefined,
  sendDefaultPii: true,
  includeLocalVariables: true,
  environment: String(process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development').trim() || 'development',
  release: String(process.env.SENTRY_RELEASE || '').trim() || undefined,
  tracesSampleRate: getSampleRateFromEnv(
    'SENTRY_TRACES_SAMPLE_RATE',
    process.env.NODE_ENV === 'production' ? 0.1 : 1,
  ),
  profilesSampleRate: getSampleRateFromEnv('SENTRY_PROFILES_SAMPLE_RATE', 0),
  enableLogs: true,
});

function logFatalError(label, error) {
  if (error instanceof Error) {
    console.error(`❌ [FATAL] ${label}: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    return;
  }

  console.error(`❌ [FATAL] ${label}:`, error);
}

function reportError(label, error, context = {}) {
  console.error(`${label}:`, error);

  Sentry.withScope((scope) => {
    scope.setTag('service', 'backend');
    scope.setTag('error_label', String(label || 'backend_error'));
    Object.entries(context || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        scope.setExtra(key, value);
      }
    });
    Sentry.captureException(error);
  });
}

async function flushSentry(timeoutMs = 2000) {
  if (!sentryEnabled) return;

  try {
    await Sentry.flush(timeoutMs);
  } catch {
    // Ignore flush failures during shutdown paths.
  }
}

function registerProcessErrorHandlers() {
  process.on('uncaughtException', async (error) => {
    logFatalError('Uncaught exception', error);
    Sentry.captureException(error);
    await flushSentry();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason) => {
    logFatalError('Unhandled promise rejection', reason);
    Sentry.captureException(reason);
    await flushSentry();
    process.exit(1);
  });
}

module.exports = {
  Sentry,
  sentryEnabled,
  logFatalError,
  reportError,
  flushSentry,
  registerProcessErrorHandlers,
};
