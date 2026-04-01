import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import './globals.css';
import { LayoutShell } from '@/components/layout/LayoutShell';
import { StoreHydration } from '@/components/StoreHydration';
import { AuthDialogWrapper } from '@/features/auth';
import { SearchDialogWrapper } from '@/components/search';
import { SonnerToaster } from '@/components/retroui';
import { GlobalLoaderOverlay } from '@/components/loader';
import { UiProcessingShield } from '@/components/ui';
import { Providers } from './providers';
import { AppwritePing } from '@/components/appwrite/AppwritePing';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

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
      <body className={`${inter.variable} antialiased`}>
        <Script
          id="syntax-stories-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var raw=localStorage.getItem('syntax-stories-theme');var theme=null;if(raw){var p=JSON.parse(raw);if(p&&p.state&&(p.state.theme==='dark'||p.state.theme==='light'))theme=p.state.theme;}if(!theme)theme=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.classList.toggle('dark',theme==='dark');}catch(e){document.documentElement.classList.toggle('dark',window.matchMedia('(prefers-color-scheme: dark)').matches);}})();`,
          }}
        />
        <Providers>
          <AppwritePing />
          <GlobalLoaderOverlay />
          <UiProcessingShield />
          <StoreHydration />
          <AuthDialogWrapper />
          <SearchDialogWrapper />
          <SonnerToaster />
          <LayoutShell>{children}</LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
