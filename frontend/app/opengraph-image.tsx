import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'RéussirTCF — Préparation TCF Canada en ligne';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #dc2626 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Grille décorative */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Accent rouge gauche */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 8,
            background: '#dc2626',
          }}
        />

        {/* Contenu central */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            zIndex: 1,
          }}
        >
          {/* Logo + nom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ fontSize: 80 }}>🍁</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: 72,
                  fontWeight: 900,
                  color: '#ffffff',
                  letterSpacing: '-2px',
                  lineHeight: 1,
                }}
              >
                RéussirTCF
              </span>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.55)',
                  letterSpacing: '4px',
                  textTransform: 'uppercase',
                  marginTop: 8,
                }}
              >
                Préparation TCF Canada
              </span>
            </div>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 28,
              color: 'rgba(255,255,255,0.8)',
              fontWeight: 400,
              textAlign: 'center',
              maxWidth: 800,
              lineHeight: 1.4,
            }}
          >
            Examens simulés · Corrections IA instantanées · Calcul NCLC officiel
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            {['🎧 Compréhension Orale', '📖 Compréhension Écrite', '✍️ Expression Écrite', '🎤 Expression Orale'].map((label) => (
              <div
                key={label}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 999,
                  padding: '8px 18px',
                  fontSize: 16,
                  color: 'rgba(255,255,255,0.85)',
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* URL bas de page */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            right: 48,
            fontSize: 18,
            color: 'rgba(255,255,255,0.4)',
            fontWeight: 600,
            letterSpacing: '1px',
          }}
        >
          reussirtcf.ca
        </div>
      </div>
    ),
    { ...size },
  );
}
