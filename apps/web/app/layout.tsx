import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://claude-agent.dev'),
  title: {
    default: 'Claude Agent Platform | AI-Powered Development Lifecycle',
    template: '%s | Claude Agent Platform',
  },
  description:
    'Transform your development workflow with AI-powered agents. Automate code reviews, testing, deployment, and more with Luna Agents and Nexa on-device inference.',
  keywords: [
    'AI agents',
    'code review',
    'automated testing',
    'CI/CD',
    'development tools',
    'AI development',
    'Luna Agents',
    'Nexa SDK',
    'on-device AI',
    'RAG',
    'Claude',
  ],
  authors: [{ name: 'Claude Agent Platform Team' }],
  creator: 'Claude Agent Platform',
  publisher: 'Claude Agent Platform',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://claude-agent.dev',
    siteName: 'Claude Agent Platform',
    title: 'Claude Agent Platform | AI-Powered Development Lifecycle',
    description:
      'Transform your development workflow with AI-powered agents. Automate code reviews, testing, deployment, and more.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Claude Agent Platform - AI Development Tools',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Claude Agent Platform | AI-Powered Development',
    description:
      'Transform your development workflow with AI-powered agents.',
    images: ['/og-image.png'],
    creator: '@claudeagent',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: 'https://claude-agent.dev',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#09090b" />
        <meta name="color-scheme" content="dark" />
      </head>
      <body className="min-h-screen bg-neutral-950 text-neutral-50 antialiased">
        {/* Animated Background Orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
        </div>
        
        {/* Grid Background */}
        <div className="fixed inset-0 bg-grid pointer-events-none z-0" />
        
        {/* Main Content */}
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
