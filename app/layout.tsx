import type { Metadata } from 'next';
import Script from 'next/script';
import { JetBrains_Mono, Inter, Barlow_Semi_Condensed } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { WebMcp } from '@/components/WebMcp';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  display: 'swap',
});

// Inter is only a fallback in the --font-sans stack now, so it is not
// preloaded; Barlow Semi Condensed carries display and body text.
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
});

const barlow = Barlow_Semi_Condensed({
  variable: '--font-barlow',
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Agent Switchboard — AI Agent Directory',
    template: '%s | Agent Switchboard',
  },
  description:
    'Browse, compare, and integrate AI agents with real API, MCP, and CLI access. The curated directory for developers building on the agentic web.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev'
  ),
  // NOTE: no global `alternates.canonical` here — a root-level canonical is
  // inherited by every page that doesn't override it, telling search engines
  // all pages are duplicates of the homepage. Each page sets its own.
  openGraph: {
    type: 'website',
    siteName: 'Agent Switchboard',
    title: 'Agent Switchboard — AI Agent Directory',
    description:
      'Browse, compare, and integrate AI agents with real API, MCP, and CLI access. The curated directory for developers building on the agentic web.',
    images: [{ url: 'https://agentswitchboard.dev/opengraph-image', width: 1200, height: 630, alt: 'Agent Switchboard — AI Agent Directory' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agent Switchboard — AI Agent Directory',
    description:
      'Browse, compare, and integrate AI agents with real API, MCP, and CLI access.',
    images: ['https://agentswitchboard.dev/opengraph-image'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${inter.variable} ${barlow.variable} h-full light`}
      suppressHydrationWarning
    >
      {/* Prevent flash: SSR defaults to light and the human view; apply a saved
          dark theme or agent view before first paint. */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;if(localStorage.getItem('theme')==='dark')d.classList.remove('light');if(localStorage.getItem('viewMode')==='agent')d.setAttribute('data-view','agent');}catch(e){}})();`,
          }}
        />
        {/* Machine-readable agent context */}
        <link rel="alternate" type="application/json" href="/agents.json" title="Agent Catalog — Agent Switchboard" />
        <link rel="alternate" type="text/markdown" href="/index.md" title="Agent Switchboard — Markdown" />
        <link rel="ai-index" href="/for-agents" />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <WebMcp />
        <Analytics />
        {umamiWebsiteId ? (
          <Script
            src="https://cloud.umami.is/script.js"
            data-website-id={umamiWebsiteId}
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
