'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#08111c',
          color: '#f8fafc',
          fontFamily: 'Arial, sans-serif',
          padding: '24px',
        }}
      >
        <main
          style={{
            width: 'min(100%, 560px)',
            background: '#0f172a',
            borderRadius: '24px',
            border: '1px solid rgba(148, 163, 184, 0.22)',
            padding: '32px',
            boxShadow: '0 24px 48px rgba(2, 6, 23, 0.35)',
          }}
        >
          <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7dd3fc', fontWeight: 700 }}>
            Bolo237 Admin
          </p>
          <h1 style={{ margin: '0 0 12px', fontSize: '32px', lineHeight: 1.1 }}>
            Admin portal error.
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: '15px', lineHeight: 1.7, color: '#cbd5e1' }}>
            The exception was recorded. Retry this screen or return to the admin entry point.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                border: 0,
                borderRadius: '999px',
                background: '#0ea5e9',
                color: '#082f49',
                padding: '12px 18px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: '999px',
                border: '1px solid rgba(148, 163, 184, 0.32)',
                color: '#f8fafc',
                padding: '12px 18px',
                fontSize: '14px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Open admin login
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}