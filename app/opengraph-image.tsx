import { ImageResponse } from 'next/og';

export const alt = 'Agent Switchboard — AI Agent Directory';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0f',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'monospace',
          position: 'relative',
        }}
      >
        {/* Grid lines background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(0,255,136,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.04) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, transparent, #00ff88, transparent)',
          }}
        />

        {/* Logo dot + name */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '48px',
          }}
        >
          <div
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#00ff88',
              boxShadow: '0 0 20px rgba(0,255,136,0.6)',
            }}
          />
          <span
            style={{
              color: '#ffffff',
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            switchboard
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            color: '#ffffff',
            fontSize: '72px',
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: '28px',
            letterSpacing: '-0.02em',
            fontFamily: 'sans-serif',
            maxWidth: '900px',
          }}
        >
          The AI Agent{' '}
          <span style={{ color: '#00ff88' }}>Directory</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            color: '#888899',
            fontSize: '28px',
            lineHeight: 1.5,
            maxWidth: '780px',
            fontFamily: 'sans-serif',
          }}
        >
          Browse, compare, and integrate AI agents with real API, MCP, and CLI access.
        </div>

        {/* Bottom tag chips */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '56px',
          }}
        >
          {['API', 'MCP', 'CLI', 'Extension'].map((tag) => (
            <div
              key={tag}
              style={{
                background: 'rgba(0,255,136,0.08)',
                border: '1px solid rgba(0,255,136,0.2)',
                borderRadius: '6px',
                padding: '6px 18px',
                color: '#00ff88',
                fontSize: '18px',
                fontFamily: 'monospace',
                letterSpacing: '0.05em',
              }}
            >
              {tag}
            </div>
          ))}
        </div>

        {/* Bottom right URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '44px',
            right: '80px',
            color: '#444455',
            fontSize: '20px',
            fontFamily: 'monospace',
          }}
        >
          agentswitchboard.dev
        </div>
      </div>
    ),
    { ...size }
  );
}
