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
    default: 'Agent Switchboard — The A2A Agent Directory',
    template: '%s | Agent Switchboard',
  },
  description:
    'Discover, compare, and connect with AI agents that speak the A2A protocol. The curated directory for the agentic web.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev'
  ),
  openGraph: {
    type: 'website',
    siteName: 'Agent Switchboard',
    title: 'Agent Switchboard — The A2A Agent Directory',
    description:
      'Discover, compare, and connect with AI agents that speak the A2A protocol.',
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
      className={`${jetbrainsMono.variable} ${inter.variable} h-full`}
    >
      {/* Prevent flash: apply saved theme before paint */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t!=='dark')document.documentElement.classList.add('light');}catch(e){document.documentElement.classList.add('light');}})();`,
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
