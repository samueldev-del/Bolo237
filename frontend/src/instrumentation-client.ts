import * as Sentry from '@sentry/nextjs';

function parseSampleRate(value: string | undefined, fallbackValue: number) {
  const parsedValue = Number(value);
  if (Number.isFinite(parsedValue) && parsedValue >= 0 && parsedValue <= 1) {
    return parsedValue;
  }

  return fallbackValue;
}

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

try {
  Sentry.init({
    enabled: Boolean(dsn),
    dsn: dsn || undefined,
    sendDefaultPii: true,
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
      process.env.SENTRY_ENVIRONMENT ||
      process.env.NODE_ENV ||
      'development',
    tracesSampleRate: parseSampleRate(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || process.env.SENTRY_TRACES_SAMPLE_RATE,
      process.env.NODE_ENV === 'production' ? 0.1 : 1,
    ),
    replaysSessionSampleRate: parseSampleRate(
      process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
      process.env.NODE_ENV === 'production' ? 0.1 : 1,
    ),
    replaysOnErrorSampleRate: parseSampleRate(
      process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
      1,
    ),
    enableLogs: true,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
} catch (error) {
  console.error('Sentry client init failed:', error);
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;