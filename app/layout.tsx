import type { Metadata } from 'next';
import { JetBrains_Mono, Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-inter',
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
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev',
  },
  openGraph: {
    type: 'website',
    siteName: 'Agent Switchboard',
    title: 'Agent Switchboard — AI Agent Directory',
    description:
      'Browse, compare, and integrate AI agents with real API, MCP, and CLI access. The curated directory for developers building on the agentic web.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agent Switchboard — AI Agent Directory',
    description:
      'Browse, compare, and integrate AI agents with real API, MCP, and CLI access.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${inter.variable} h-full light`}
      suppressHydrationWarning
    >
      {/* Prevent flash: SSR defaults to light; remove class only if user saved dark */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.remove('light');}catch(e){}})();`,
          }}
        />
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-YF8BJ449WX" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-YF8BJ449WX');`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
