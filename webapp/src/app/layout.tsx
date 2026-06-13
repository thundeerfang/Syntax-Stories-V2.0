import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LayoutShell } from '@/components/layout';
import { StoreHydration } from '@/components/StoreHydration';
import { AuthDialogWrapper } from '@/features/auth';
import { SearchDialogWrapper } from '@/components/search';
import { SonnerToaster } from '@/components/retroui';
import { UiProcessingShield } from '@/components/ui/feedback';
import { Providers } from './providers';
import { AppwritePing } from '@/components/appwrite/AppwritePing';
import { ConnectivityGate } from '@/features/connectivity';
import { NotificationRealtimeBridge } from '@/components/notifications/NotificationRealtimeBridge';
import { GlobalEngagementEffects } from '@/components/effects/GlobalEngagementEffects';
import { AchievementCelebrationHost } from '@/features/achievements/components/AchievementCelebrationHost';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

/** Inline in <head> so it runs before paint; avoids next/script in <body> (React 19 + RSC warnings). */
const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var raw=localStorage.getItem('syntax-stories-theme');var resolved=null;if(raw){var p=JSON.parse(raw);var stored=p&&p.state&&p.state.theme;if(stored==='dark'||stored==='light')resolved=stored;else if(stored==='system'||!stored)resolved=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(!resolved)resolved=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.classList.toggle('dark',resolved==='dark');document.documentElement.style.colorScheme=resolved;}catch(e){var fb=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.classList.toggle('dark',fb==='dark');document.documentElement.style.colorScheme=fb;}})();`;

export const metadata: Metadata = {
  title: 'Syntax Stories – Tech stories for developers',
  description:
    'Tech stories and ideas for developers. Read and share articles on programming, web development, and more.',
  icons: {
    icon: [
      { url: '/favicon/favicon.ico', sizes: 'any' },
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/favicon/apple-touch-icon.png',
  },
  manifest: '/favicon/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script
          id="syntax-stories-theme-init"
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <Providers>
          <AppwritePing />
          <UiProcessingShield />
          <StoreHydration />
          <AuthDialogWrapper />
          <SearchDialogWrapper />
          <SonnerToaster />
          <NotificationRealtimeBridge />
          <LayoutShell>{children}</LayoutShell>
          <AchievementCelebrationHost />
          <GlobalEngagementEffects />
          <ConnectivityGate />
        </Providers>
      </body>
    </html>
  );
}
