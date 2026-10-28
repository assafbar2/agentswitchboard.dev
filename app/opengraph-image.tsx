import { ImageResponse } from 'next/og';

export const alt = 'Agent Switchboard — AI Agent Directory';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Exchange Directory look: white paper, #111 ink, signal yellow as a fill
// only (the name block and the access-method tags), square corners.
const INK = '#111111';
const PAPER = '#ffffff';
const YELLOW = '#FFD400';
const MUTED = '#444444';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: PAPER,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'sans-serif',
          color: INK,
        }}
      >
        {/* Header strip: yellow name block on a heavy ink rule */}
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            height: '120px',
            borderBottom: `6px solid ${INK}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 64px',
              background: YELLOW,
              color: INK,
              fontSize: '44px',
              fontWeight: 800,
              letterSpacing: '-0.01em',
            }}
          >
            switchboard
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: '56px 64px 0',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '88px',
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.025em',
              marginBottom: '28px',
            }}
          >
            The AI Agent Directory
          </div>

          <div
            style={{
              display: 'flex',
              color: MUTED,
              fontSize: '30px',
              lineHeight: 1.4,
              maxWidth: '900px',
            }}
          >
            Browse, compare, and integrate AI agents with real API, MCP, and CLI access.
          </div>

          {/* Tags: ink on yellow fills */}
          <div style={{ display: 'flex', gap: '14px', marginTop: '44px' }}>
            {['API', 'MCP', 'CLI', 'Extension'].map((tag) => (
              <div
                key={tag}
                style={{
                  display: 'flex',
                  background: YELLOW,
                  color: INK,
                  padding: '8px 20px',
                  fontSize: '22px',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>

        {/* Footer rule + URL */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            margin: '0 64px',
            padding: '18px 0 40px',
            borderTop: `3px solid ${INK}`,
            color: INK,
            fontSize: '24px',
            fontWeight: 600,
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
