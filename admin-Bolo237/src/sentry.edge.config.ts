import * as Sentry from '@sentry/nextjs';

function parseSampleRate(value: string | undefined, fallbackValue: number) {
  const parsedValue = Number(value);
  if (Number.isFinite(parsedValue) && parsedValue >= 0 && parsedValue <= 1) {
    return parsedValue;
  }

  return fallbackValue;
}

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  enabled: Boolean(dsn),
  dsn: dsn || undefined,
  sendDefaultPii: true,
  environment:
    process.env.SENTRY_ENVIRONMENT ||
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
    process.env.NODE_ENV ||
    'development',
  tracesSampleRate: parseSampleRate(
    process.env.SENTRY_TRACES_SAMPLE_RATE || process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
    process.env.NODE_ENV === 'production' ? 0.1 : 1,
  ),
  enableLogs: true,
});