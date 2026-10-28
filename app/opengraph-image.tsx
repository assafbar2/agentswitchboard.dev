import { ImageResponse } from 'next/og';

export const alt = 'Agent Switchboard — AI Agent Directory';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0e0b',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          position: 'relative',
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, transparent, #4ade80, transparent)',
            display: 'flex',
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
              background: '#4ade80',
              display: 'flex',
            }}
          />
          <span
            style={{
              color: '#e6ede8',
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              fontFamily: 'monospace',
            }}
          >
            switchboard
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            gap: '18px',
            marginBottom: '28px',
          }}
        >
          <span
            style={{
              color: '#e6ede8',
              fontSize: '72px',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              fontFamily: 'sans-serif',
            }}
          >
            The AI Agent
          </span>
          <span
            style={{
              color: '#4ade80',
              fontSize: '72px',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              fontFamily: 'sans-serif',
            }}
          >
            Directory
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: 'flex',
            color: '#a9b6ae',
            fontSize: '28px',
            lineHeight: 1.5,
            maxWidth: '780px',
            fontFamily: 'sans-serif',
          }}
        >
          Browse, compare, and integrate AI agents with real API, MCP, and CLI access.
        </div>

        {/* Tag chips */}
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
                display: 'flex',
                background: 'rgba(74,222,128,0.08)',
                border: '1px solid rgba(74,222,128,0.28)',
                borderRadius: '6px',
                padding: '6px 18px',
                color: '#4ade80',
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
            display: 'flex',
            color: '#93a39a',
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
