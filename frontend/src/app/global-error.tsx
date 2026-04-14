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
          background: '#f4f6f8',
          color: '#102027',
          fontFamily: 'Arial, sans-serif',
          padding: '24px',
        }}
      >
        <main
          style={{
            width: 'min(100%, 560px)',
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #d9e2ec',
            padding: '32px',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08)',
          }}
        >
          <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0f766e', fontWeight: 700 }}>
            Bolo237
          </p>
          <h1 style={{ margin: '0 0 12px', fontSize: '32px', lineHeight: 1.1 }}>
            Something went wrong.
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: '15px', lineHeight: 1.7, color: '#475569' }}>
            The issue was recorded. You can retry this screen or go back to the public homepage.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                border: 0,
                borderRadius: '999px',
                background: '#0f766e',
                color: '#ffffff',
                padding: '12px 18px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/en"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: '999px',
                border: '1px solid #cbd5e1',
                color: '#102027',
                padding: '12px 18px',
                fontSize: '14px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Open homepage
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}