import { ImageResponse } from 'next/og';
import { truncateText } from '@/lib/seo';

export const OG_IMAGE_SIZE = {
  width: 1200,
  height: 630,
} as const;

export const OG_CONTENT_TYPE = 'image/png';

type OpenGraphCardInput = {
  eyebrow: string;
  title: string;
  subtitle: string;
  meta?: string[];
  footerLabel: string;
  accentColor?: string;
};

export function createOpenGraphCard({
  eyebrow,
  title,
  subtitle,
  meta = [],
  footerLabel,
  accentColor = '#F4B394',
}: OpenGraphCardInput) {
  const safeTitle = truncateText(title, 72);
  const safeSubtitle = truncateText(subtitle, 170);
  const safeMeta = meta.filter(Boolean).slice(0, 3).map((item) => truncateText(item, 34));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: 'linear-gradient(135deg, #111827 0%, #1F2937 42%, #C4623F 130%)',
          color: '#FFFFFF',
          padding: '42px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRadius: '28px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'radial-gradient(circle at top right, rgba(255,255,255,0.18), rgba(255,255,255,0) 34%), rgba(17, 24, 39, 0.78)',
            padding: '44px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: accentColor,
                  color: '#111827',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 800,
                }}
              >
                B
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: '18px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.72)',
                }}
              >
                {eyebrow}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '28px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
              }}
            >
              Bolo237
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              maxWidth: '900px',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '68px',
                fontWeight: 800,
                lineHeight: 1.02,
                letterSpacing: '-0.05em',
              }}
            >
              {safeTitle}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '28px',
                lineHeight: 1.38,
                color: 'rgba(255,255,255,0.82)',
              }}
            >
              {safeSubtitle}
            </div>
            {safeMeta.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                {safeMeta.map((item) => (
                  <div
                    key={item}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '999px',
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: 'rgba(255,255,255,0.08)',
                      padding: '10px 16px',
                      fontSize: '20px',
                      color: 'rgba(255,255,255,0.92)',
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '24px',
                color: 'rgba(255,255,255,0.72)',
              }}
            >
              Jobs, artisans et profils au Cameroun
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '22px',
                fontWeight: 700,
                color: accentColor,
              }}
            >
              {footerLabel}
            </div>
          </div>
        </div>
      </div>
    ),
    OG_IMAGE_SIZE
  );
}